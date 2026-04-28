import { BankClient } from "../../BankClient.js";
import type { FederationCentralBankLoader, SupplySettlementRecord } from "./FederationCentralBankLoader.js";

export { type SupplySettlementRecord } from "./FederationCentralBankLoader.js";

export const FEDERATION_CENTRAL_BANK_ID = "ecf-federation-central-bank-000001";

/**
 * The Federation Central Bank is the sole issuer of kithe.
 *
 * Holds one issuance account with overdraftLimit = -Infinity.
 * A negative balance means kithe is in circulation.
 *
 * Issue kithe to member communities; retire it when it flows back.
 *
 * Monthly settlement:
 *   On the first of each month, settleMoneySupply() compares the actual kithe
 *   in circulation against the target (uniqueMembers × kithePerPersonYear) and
 *   issues or requests retirement of the difference.
 */
export class FederationCentralBank {
    private static instance: FederationCentralBank;

    private _ownerId!: string;
    private _issuanceAccountId!: string;
    private _bank!: BankClient;
    private _loader!: FederationCentralBankLoader;
    private _ready             = false;
    private _lastSettlementDate: string | null = null;
    private _settlementHistory: SupplySettlementRecord[] = [];

    private constructor() {}

    static getInstance(): FederationCentralBank {
        if (!FederationCentralBank.instance) {
            FederationCentralBank.instance = new FederationCentralBank();
        }
        return FederationCentralBank.instance;
    }

    isReady(): boolean              { return this._ready; }
    get ownerId(): string           { if (!this._ready) throw new Error("FederationCentralBank not ready"); return this._ownerId; }
    get issuanceAccountId(): string { if (!this._ready) throw new Error("FederationCentralBank not ready"); return this._issuanceAccountId; }
    get lastSettlementDate(): string | null { return this._lastSettlementDate; }
    get settlementHistory(): SupplySettlementRecord[] { return [...this._settlementHistory]; }

    async init(bank: BankClient, loader: FederationCentralBankLoader): Promise<void> {
        this._bank   = bank;
        this._loader = loader;

        if (loader.exists()) {
            const record = loader.load();
            this._ownerId             = record.ownerId;
            this._issuanceAccountId   = record.issuanceAccountId;
            this._lastSettlementDate  = record.lastSettlementDate;
            this._settlementHistory   = record.settlementHistory ?? [];
            this._ready = true;
            return;
        }

        // First boot — register with the federation bank
        const owner = await bank.createOwner("institution", "Federation Central Bank", {
            ownerId: FEDERATION_CENTRAL_BANK_ID,
        });
        this._ownerId = owner.ownerId;

        const account = await bank.openAccount(
            this._ownerId,
            "Federation Central Bank",
            "kithe",
            null, // null → -Infinity overdraft
        );
        this._issuanceAccountId = account.accountId;

        this._persist();
        this._ready = true;
        console.log("[FederationCentralBank] registered; issuance account:", this._issuanceAccountId);
    }

    /** Issue kithe into circulation to a recipient account. */
    async issue(amount: number, recipientAccountId: string, memo = "kithe issuance"): Promise<void> {
        await this._bank.transfer(this._issuanceAccountId, recipientAccountId, amount, memo);
    }

    /** Retire kithe from circulation. */
    async retire(amount: number, sourceAccountId: string, memo = "kithe retirement"): Promise<void> {
        await this._bank.transfer(sourceAccountId, this._issuanceAccountId, amount, memo);
    }

    /**
     * Kithe in circulation = -(issuance account balance).
     * The issuance account goes negative as kithe is issued; the magnitude is
     * the total supply in circulation.
     */
    async kitheInCirculation(): Promise<number> {
        const account = await this._bank.getAccountById(this._issuanceAccountId);
        return account ? -(account.amount) : 0;
    }

    /**
     * Compute and apply the monthly money supply adjustment.
     *
     * targetSupply  = uniqueMembers × kithePerPersonYear
     * netAdjustment = targetSupply − actualCirculation
     *
     * Positive delta → issue the difference to the federation treasury.
     * Negative delta → record the overage; the scheduler can request voluntary
     *   retirements from member communities via the levy mechanism, but cannot
     *   force it. The overage is logged and visible in settlementHistory.
     * Zero / below threshold → no action.
     *
     * @param uniqueMembers     Deduplicated member count from the census.
     * @param kithePerPersonYear  From FederationConstitution.kithePerPersonYear.
     * @param treasuryAccountId  Where newly issued kithe lands.
     * @param threshold          Minimum absolute delta before any action is taken.
     *                           Prevents tiny adjustments on small populations.
     */
    async settleMoneySupply(
        uniqueMembers: number,
        kithePerPersonYear: number,
        treasuryAccountId: string,
        threshold = 1,
    ): Promise<SupplySettlementRecord> {
        const targetSupply     = Math.round(uniqueMembers * kithePerPersonYear);
        const actualCirculation = await this.kitheInCirculation();
        const netAdjustment    = targetSupply - actualCirculation;

        if (Math.abs(netAdjustment) >= threshold) {
            if (netAdjustment > 0) {
                await this.issue(
                    netAdjustment,
                    treasuryAccountId,
                    `monthly supply adjustment +${netAdjustment} kithe (${uniqueMembers} members)`,
                );
            } else {
                // Cannot force retirement — log it; the levy cycle can recoup it over time.
                console.warn(
                    `[FederationCentralBank] supply overage of ${-netAdjustment} kithe ` +
                    `(target=${targetSupply}, actual=${actualCirculation}) — ` +
                    `overage will be recouped via levy`,
                );
            }
        }

        const record: SupplySettlementRecord = {
            settledAt:         new Date().toISOString(),
            uniqueMembers,
            targetSupply,
            actualCirculation,
            netAdjustment,
        };

        this._lastSettlementDate = record.settledAt;
        this._settlementHistory  = [...this._settlementHistory, record].slice(-24);
        this._persist();

        console.log(
            `[FederationCentralBank] monthly settlement: ` +
            `members=${uniqueMembers} target=${targetSupply} ` +
            `actual=${actualCirculation} net=${netAdjustment > 0 ? "+" : ""}${netAdjustment}`,
        );
        return record;
    }

    // ── Internal ──────────────────────────────────────────────────────────────

    private _persist(): void {
        this._loader.save({
            ownerId:            this._ownerId,
            issuanceAccountId:  this._issuanceAccountId,
            registeredAt:       new Date().toISOString(),
            lastSettlementDate: this._lastSettlementDate,
            settlementHistory:  this._settlementHistory,
        });
    }
}
