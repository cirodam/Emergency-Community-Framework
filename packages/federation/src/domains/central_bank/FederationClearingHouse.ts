import { BankClient } from "../../BankClient.js";
import type { FederationClearingHouseLoader } from "./FederationClearingHouseLoader.js";

export const FEDERATION_CLEARING_HOUSE_ID = "ecf-federation-clearing-house-000001";

/**
 * The Federation Clearing House maintains kin accounts for every member
 * community and processes inter-community transfers.
 *
 * It is NOT an issuer. Communities issue kin locally; the clearing house only
 * moves kin between community accounts on the federation ledger.
 *
 * A single structural-aid account (overdraftLimit = -Infinity) lets the
 * clearing house make unconditional mutual-aid grants to member communities
 * when the federation assembly votes to do so. This mirrors how communities
 * use their own CentralBank for crisis issuance.
 *
 * Clearing fee: a small constitutional fraction of every transfer is
 * deposited into the federation treasury, funding governance operations.
 *
 * Credit lines: each community's account has a maximum negative balance
 * (creditLineKin). Transfers that would push the sender below -creditLineKin
 * are rejected unless the transfer is flagged as mutual aid.
 */
export class FederationClearingHouse {
    private static _instance: FederationClearingHouse;

    private _ownerId!: string;
    private _structuralAidAccountId!: string;
    private _solidarityPoolAccountId!: string;
    private _bank!: BankClient;
    private _loader!: FederationClearingHouseLoader;
    private _ready = false;

    private constructor() {}

    static getInstance(): FederationClearingHouse {
        if (!FederationClearingHouse._instance) {
            FederationClearingHouse._instance = new FederationClearingHouse();
        }
        return FederationClearingHouse._instance;
    }

    isReady(): boolean                           { return this._ready; }
    get ownerId(): string                        { if (!this._ready) throw new Error("FederationClearingHouse not ready"); return this._ownerId; }
    get structuralAidAccountId(): string         { if (!this._ready) throw new Error("FederationClearingHouse not ready"); return this._structuralAidAccountId; }
    get solidarityPoolAccountId(): string        { if (!this._ready) throw new Error("FederationClearingHouse not ready"); return this._solidarityPoolAccountId; }

    async init(bank: BankClient, loader: FederationClearingHouseLoader): Promise<void> {
        this._bank   = bank;
        this._loader = loader;

        if (loader.exists()) {
            const record = loader.load();
            this._ownerId                = record.ownerId;
            this._structuralAidAccountId = record.issuanceAccountId;
            this._solidarityPoolAccountId = record.solidarityPoolAccountId;

            // Back-compat: if an existing deployment has no solidarity pool yet, create one
            if (!this._solidarityPoolAccountId) {
                const account = await bank.openAccount(this._ownerId, "Federation Solidarity Pool", "kithe");
                this._solidarityPoolAccountId = account.accountId;
                loader.save({
                    ownerId:                 this._ownerId,
                    issuanceAccountId:       this._structuralAidAccountId,
                    solidarityPoolAccountId: this._solidarityPoolAccountId,
                    registeredAt:            record.registeredAt,
                });
                console.log("[FederationClearingHouse] created solidarity pool account:", this._solidarityPoolAccountId);
            }

            this._ready = true;
            return;
        }

        // First boot — register with the federation bank
        const owner = await bank.createOwner("institution", "Federation Clearing House", {
            ownerId: FEDERATION_CLEARING_HOUSE_ID,
        });
        this._ownerId = owner.ownerId;

        // Structural aid account: overdraftLimit = -Infinity, used only for
        // assembly-approved unconditional grants to member communities.
        const aidAccount = await bank.openAccount(
            this._ownerId,
            "Federation Structural Aid",
            "kithe",
            null, // null → -Infinity overdraft
        );
        this._structuralAidAccountId = aidAccount.accountId;

        // Solidarity pool: receives the solidarity fraction of demurrage charges
        // and redistributes monthly to communities running deficits.
        const solidarityAccount = await bank.openAccount(
            this._ownerId,
            "Federation Solidarity Pool",
            "kithe",
        );
        this._solidarityPoolAccountId = solidarityAccount.accountId;

        loader.save({
            ownerId:                 this._ownerId,
            issuanceAccountId:       this._structuralAidAccountId,
            solidarityPoolAccountId: this._solidarityPoolAccountId,
            registeredAt:            new Date().toISOString(),
        });
        this._ready = true;
        console.log(
            "[FederationClearingHouse] registered;",
            "structural-aid:", this._structuralAidAccountId,
            "solidarity pool:", this._solidarityPoolAccountId,
        );
    }

    /**
     * Transfer kin between two community accounts on the federation ledger.
     *
     * @param fromAccountId  Sender's federation kin account.
     * @param toAccountId    Recipient's federation kin account.
     * @param amount         Kin to transfer (before fee deduction).
     * @param memo           Transaction note.
     * @param clearingFeeRate  Fraction deducted from sender and sent to treasury (0–1).
     * @param treasuryAccountId  Where the fee lands.
     * @param creditLineKin  Maximum deficit allowed for sender. Ignored when mutualAid=true.
     * @param senderBalance  Current balance of sender (fetched by caller to avoid double-fetch).
     * @param mutualAid      Skip fee and credit line check.
     */
    async transfer(
        fromAccountId: string,
        toAccountId: string,
        amount: number,
        memo: string,
        clearingFeeRate: number,
        treasuryAccountId: string,
        creditLineKin: number,
        senderBalance: number,
        mutualAid = false,
    ): Promise<{ fee: number }> {
        if (!mutualAid) {
            // Credit line check: sender balance after transfer must not exceed deficit
            const balanceAfter = senderBalance - amount;
            if (balanceAfter < -creditLineKin) {
                throw new Error(
                    `Transfer would exceed credit line. ` +
                    `Current balance: ${senderBalance}, amount: ${amount}, ` +
                    `credit line: ${creditLineKin} (maximum deficit: ${-creditLineKin})`,
                );
            }
        }

        const fee = mutualAid ? 0 : Math.floor(amount * clearingFeeRate);
        const net = amount - fee;

        // Move the net amount to recipient
        await this._bank.transfer(fromAccountId, toAccountId, net, memo);

        // Move the fee to treasury (if any)
        if (fee > 0) {
            await this._bank.transfer(
                fromAccountId,
                treasuryAccountId,
                fee,
                `clearing fee — ${memo}`,
            );
        }

        return { fee };
    }

    /**
     * Unconditional structural-aid grant from the clearing house to a community.
     * Requires assembly authorisation — enforce that in the calling route.
     * The clearing house's structural-aid account has -Infinity overdraft.
     */
    async structuralAidGrant(
        toAccountId: string,
        amount: number,
        memo: string,
    ): Promise<void> {
        await this._bank.transfer(
            this._structuralAidAccountId,
            toAccountId,
            amount,
            memo,
        );
    }

    /** Total kin held across all community accounts (positive balances only). */
    async kinInClearing(): Promise<number> {
        const account = await this._bank.getAccountById(this._structuralAidAccountId);
        // Structural aid balance is negative when grants have been made.
        // Total clearing kin = -(structural aid balance) approximates grants outstanding.
        return account ? -(account.amount) : 0;
    }

    /**
     * Demurrage sweep: collect a holding charge from any community whose balance
     * exceeds (creditLineKin × surplusThresholdMultiple).
     *
     * The charge is split: solidarityPoolFraction goes to the solidarity pool
     * (redistributed to deficit communities), the remainder to the treasury.
     *
     * Only the portion *above* the threshold is charged — communities are never
     * penalised for holding a reasonable surplus, only for indefinite hoarding.
     *
     * @param members              All federation members with their credit lines.
     * @param surplusThreshold     Multiple of creditLineKin above which demurrage applies.
     * @param demurrageRate        Monthly fraction charged on the excess (e.g. 0.005 = 0.5%).
     * @param solidarityFraction   Fraction of each charge routed to solidarity pool (0–1).
     * @param treasuryAccountId    Where the non-solidarity portion lands.
     * @returns Summary of charges applied.
     */
    async sweepDemurrage(
        members: Array<{ id: string; name: string; bankAccountId: string | null; creditLineKin: number }>,
        surplusThreshold: number,
        demurrageRate: number,
        solidarityFraction: number,
        treasuryAccountId: string,
    ): Promise<Array<{ memberId: string; name: string; balance: number; threshold: number; charge: number; toSolidarity: number; toTreasury: number }>> {
        if (!this._ready) throw new Error("FederationClearingHouse not ready");

        const results: Array<{ memberId: string; name: string; balance: number; threshold: number; charge: number; toSolidarity: number; toTreasury: number }> = [];

        for (const member of members) {
            if (!member.bankAccountId) continue;

            const account = await this._bank.getAccountById(member.bankAccountId);
            if (!account) continue;

            const balance   = account.amount;
            const ceiling   = member.creditLineKin * surplusThreshold;
            const excess    = balance - ceiling;

            if (excess <= 0) continue;

            const charge       = Math.floor(excess * demurrageRate);
            if (charge === 0) continue;

            const toSolidarity = Math.floor(charge * solidarityFraction);
            const toTreasury   = charge - toSolidarity;

            if (toSolidarity > 0) {
                await this._bank.transfer(
                    member.bankAccountId,
                    this._solidarityPoolAccountId,
                    toSolidarity,
                    `demurrage → solidarity pool — ${member.name}`,
                );
            }
            if (toTreasury > 0) {
                await this._bank.transfer(
                    member.bankAccountId,
                    treasuryAccountId,
                    toTreasury,
                    `demurrage → treasury — ${member.name}`,
                );
            }

            results.push({ memberId: member.id, name: member.name, balance, threshold: ceiling, charge, toSolidarity, toTreasury });
        }

        if (results.length > 0) {
            const totalCharge     = results.reduce((s, r) => s + r.charge, 0);
            const totalSolidarity = results.reduce((s, r) => s + r.toSolidarity, 0);
            console.log(
                `[FederationClearingHouse] demurrage sweep: ${results.length} charge(s), ` +
                `total ${totalCharge} kin (${totalSolidarity} → solidarity, ${totalCharge - totalSolidarity} → treasury)`,
            );
        }

        return results;
    }

    /**
     * Redistribute the solidarity pool to communities running deficits.
     *
     * Distribution is proportional to need: each deficit community receives
     * a share of the pool weighted by how far below zero its balance is.
     * No community is brought above zero — solidarity fills the hole, not more.
     *
     * @param members  All federation members.
     * @returns Summary of distributions made.
     */
    async redistributeSolidarity(
        members: Array<{ id: string; name: string; bankAccountId: string | null }>,
    ): Promise<Array<{ memberId: string; name: string; deficit: number; received: number }>> {
        if (!this._ready) throw new Error("FederationClearingHouse not ready");

        const poolAccount = await this._bank.getAccountById(this._solidarityPoolAccountId);
        const poolBalance = poolAccount?.amount ?? 0;

        if (poolBalance <= 0) return [];

        // Find communities in deficit and their need
        const deficitCommunities: Array<{ id: string; name: string; accountId: string; deficit: number }> = [];
        for (const member of members) {
            if (!member.bankAccountId) continue;
            const account = await this._bank.getAccountById(member.bankAccountId);
            if (!account || account.amount >= 0) continue;
            deficitCommunities.push({
                id:        member.id,
                name:      member.name,
                accountId: member.bankAccountId,
                deficit:   -account.amount, // positive number: how much in the hole
            });
        }

        if (deficitCommunities.length === 0) {
            console.log("[FederationClearingHouse] solidarity redistribution: no communities in deficit");
            return [];
        }

        const totalDeficit = deficitCommunities.reduce((s, c) => s + c.deficit, 0);
        const results: Array<{ memberId: string; name: string; deficit: number; received: number }> = [];

        for (const community of deficitCommunities) {
            // Proportional share, capped at filling the deficit exactly
            const share    = Math.floor((community.deficit / totalDeficit) * poolBalance);
            const received = Math.min(share, community.deficit);
            if (received <= 0) continue;

            await this._bank.transfer(
                this._solidarityPoolAccountId,
                community.accountId,
                received,
                `solidarity redistribution — ${community.name}`,
            );

            results.push({ memberId: community.id, name: community.name, deficit: community.deficit, received });
        }

        if (results.length > 0) {
            console.log(
                `[FederationClearingHouse] solidarity redistribution: ${results.length} community(ies), ` +
                `total ${results.reduce((s, r) => s + r.received, 0)} kin distributed`,
            );
        }

        return results;
    }
}
