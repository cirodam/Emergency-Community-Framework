import { BankClient } from "@ecf/core";
import type { GlobeClearingHouseLoader } from "./GlobeClearingHouseLoader.js";

export const GLOBE_CLEARING_HOUSE_ID = "ecf-globe-clearing-house-000001";

/**
 * The Globe Clearing House maintains kin accounts for every member
 * commonwealth and processes inter-commonwealth transfers.
 *
 * Mechanics are identical to CommonwealthClearingHouse and
 * FederationClearingHouse — same bancor formula, one layer higher:
 * - Credit lines based on each commonwealth's total population
 * - Demurrage on surplus above (creditLine × surplusThresholdMultiple)
 * - Solidarity pool redistributed monthly to deficit commonwealths
 * - Structural aid account (overdraftLimit = -Infinity) for assembly-approved
 *   catastrophic aid grants (climate events, planetary emergencies)
 */
export class GlobeClearingHouse {
    private static _instance: GlobeClearingHouse;

    private _ownerId!: string;
    private _structuralAidAccountId!: string;
    private _solidarityPoolAccountId!: string;
    private _bank!: BankClient;
    private _loader!: GlobeClearingHouseLoader;
    private _ready = false;

    private constructor() {}

    static getInstance(): GlobeClearingHouse {
        if (!GlobeClearingHouse._instance) {
            GlobeClearingHouse._instance = new GlobeClearingHouse();
        }
        return GlobeClearingHouse._instance;
    }

    isReady(): boolean                    { return this._ready; }
    get ownerId(): string                 { if (!this._ready) throw new Error("GlobeClearingHouse not ready"); return this._ownerId; }
    get structuralAidAccountId(): string  { if (!this._ready) throw new Error("GlobeClearingHouse not ready"); return this._structuralAidAccountId; }
    get solidarityPoolAccountId(): string { if (!this._ready) throw new Error("GlobeClearingHouse not ready"); return this._solidarityPoolAccountId; }

    async init(bank: BankClient, loader: GlobeClearingHouseLoader): Promise<void> {
        this._bank   = bank;
        this._loader = loader;

        if (loader.exists()) {
            const record = loader.load();
            this._ownerId                = record.ownerId;
            this._structuralAidAccountId = record.structuralAidAccountId;
            this._solidarityPoolAccountId = record.solidarityPoolAccountId;

            if (!this._solidarityPoolAccountId) {
                const account = await bank.openAccount(this._ownerId, "Globe Solidarity Pool", "kithe");
                this._solidarityPoolAccountId = account.accountId;
                loader.save({
                    ownerId:                 this._ownerId,
                    structuralAidAccountId:  this._structuralAidAccountId,
                    solidarityPoolAccountId: this._solidarityPoolAccountId,
                    registeredAt:            record.registeredAt,
                });
                console.log("[GlobeClearingHouse] created solidarity pool:", this._solidarityPoolAccountId);
            }

            this._ready = true;
            return;
        }

        const owner = await bank.createOwner("institution", "Globe Clearing House", {
            ownerId: GLOBE_CLEARING_HOUSE_ID,
        });
        this._ownerId = owner.ownerId;

        const aidAccount = await bank.openAccount(
            this._ownerId,
            "Globe Structural Aid",
            "kithe",
            null, // -Infinity overdraft
        );
        this._structuralAidAccountId = aidAccount.accountId;

        const solidarityAccount = await bank.openAccount(
            this._ownerId,
            "Globe Solidarity Pool",
            "kithe",
        );
        this._solidarityPoolAccountId = solidarityAccount.accountId;

        loader.save({
            ownerId:                 this._ownerId,
            structuralAidAccountId:  this._structuralAidAccountId,
            solidarityPoolAccountId: this._solidarityPoolAccountId,
            registeredAt:            new Date().toISOString(),
        });
        this._ready = true;
        console.log(
            "[GlobeClearingHouse] registered;",
            "structural-aid:", this._structuralAidAccountId,
            "solidarity pool:", this._solidarityPoolAccountId,
        );
    }

    /** Transfer kin between two commonwealth accounts on the globe ledger. */
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
            const balanceAfter = senderBalance - amount;
            if (balanceAfter < -creditLineKin) {
                throw new Error(
                    `Transfer would exceed credit line. ` +
                    `Current balance: ${senderBalance}, amount: ${amount}, ` +
                    `credit line: ${creditLineKin}`,
                );
            }
        }

        const fee = mutualAid ? 0 : Math.floor(amount * clearingFeeRate);
        const net = amount - fee;

        await this._bank.transfer(fromAccountId, toAccountId, net, memo);

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
     * Unconditional catastrophic-aid grant to a member commonwealth.
     * Requires globe assembly authorisation — enforce in the calling route.
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

    /** Total kin injected via aid grants (negation of structural aid account balance). */
    async kinInClearing(): Promise<number> {
        const account = await this._bank.getAccountById(this._structuralAidAccountId);
        return account ? -(account.amount) : 0;
    }

    /**
     * Demurrage sweep: charge commonwealths whose balance exceeds
     * (creditLineKin × surplusThreshold). Split between solidarity pool and treasury.
     */
    async sweepDemurrage(
        members: Array<{ id: string; name: string; bankAccountId: string | null; creditLineKin: number }>,
        surplusThreshold: number,
        demurrageRate: number,
        solidarityFraction: number,
        treasuryAccountId: string,
    ): Promise<Array<{ memberId: string; name: string; balance: number; threshold: number; charge: number; toSolidarity: number; toTreasury: number }>> {
        if (!this._ready) throw new Error("GlobeClearingHouse not ready");

        const results: Array<{ memberId: string; name: string; balance: number; threshold: number; charge: number; toSolidarity: number; toTreasury: number }> = [];

        for (const member of members) {
            if (!member.bankAccountId) continue;

            const account = await this._bank.getAccountById(member.bankAccountId);
            if (!account) continue;

            const balance = account.amount;
            const ceiling = member.creditLineKin * surplusThreshold;
            const excess  = balance - ceiling;

            if (excess <= 0) continue;

            const charge = Math.floor(excess * demurrageRate);
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
                `[GlobeClearingHouse] demurrage sweep: ${results.length} charge(s), ` +
                `total ${totalCharge} kin (${totalSolidarity} → solidarity, ${totalCharge - totalSolidarity} → treasury)`,
            );
        }

        return results;
    }

    /**
     * Redistribute the solidarity pool to commonwealths running deficits,
     * proportional to deficit depth, capped at filling each deficit to zero.
     */
    async redistributeSolidarity(
        members: Array<{ id: string; name: string; bankAccountId: string | null }>,
    ): Promise<Array<{ memberId: string; name: string; deficit: number; received: number }>> {
        if (!this._ready) throw new Error("GlobeClearingHouse not ready");

        const poolAccount = await this._bank.getAccountById(this._solidarityPoolAccountId);
        const poolBalance = poolAccount?.amount ?? 0;

        if (poolBalance <= 0) return [];

        const deficitCommonwealths: Array<{ id: string; name: string; accountId: string; deficit: number }> = [];
        for (const member of members) {
            if (!member.bankAccountId) continue;
            const account = await this._bank.getAccountById(member.bankAccountId);
            if (!account || account.amount >= 0) continue;
            deficitCommonwealths.push({
                id:        member.id,
                name:      member.name,
                accountId: member.bankAccountId,
                deficit:   -account.amount,
            });
        }

        if (deficitCommonwealths.length === 0) {
            console.log("[GlobeClearingHouse] solidarity redistribution: no commonwealths in deficit");
            return [];
        }

        const totalDeficit = deficitCommonwealths.reduce((s, c) => s + c.deficit, 0);
        const results: Array<{ memberId: string; name: string; deficit: number; received: number }> = [];

        for (const commonwealth of deficitCommonwealths) {
            const share    = Math.floor((commonwealth.deficit / totalDeficit) * poolBalance);
            const received = Math.min(share, commonwealth.deficit);
            if (received <= 0) continue;

            await this._bank.transfer(
                this._solidarityPoolAccountId,
                commonwealth.accountId,
                received,
                `solidarity redistribution — ${commonwealth.name}`,
            );

            results.push({ memberId: commonwealth.id, name: commonwealth.name, deficit: commonwealth.deficit, received });
        }

        if (results.length > 0) {
            const total = results.reduce((s, r) => s + r.received, 0);
            console.log(`[GlobeClearingHouse] solidarity distributed: ${total} kin to ${results.length} commonwealth(s)`);
        }

        return results;
    }
}
