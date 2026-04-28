import { BankClient } from "@ecf/core";
import type { FederationTreasuryLoader } from "./FederationTreasuryLoader.js";

export const FEDERATION_TREASURY_ID = "ecf-federation-treasury-000002";

/**
 * The Federation Treasury holds the federation's operating funds in kithe.
 *
 * Funded by:
 *   - Member community levies (periodic contribution from each member's kithe account)
 *   - Kithe issued directly by the Federation Central Bank for federation operations
 *
 * Spending is governed by the FederationConstitution budget parameters and
 * federation assembly/council resolutions.
 *
 * The treasury is the chokepoint through which all federation expenditure flows —
 * domain budgets are disbursed from here, not directly from issuance.
 */
export class FederationTreasury {
    private static instance: FederationTreasury;

    private _ownerId!: string;
    private _accountId!: string;
    private _bank!: BankClient;
    private _ready = false;

    private constructor() {}

    static getInstance(): FederationTreasury {
        if (!FederationTreasury.instance) FederationTreasury.instance = new FederationTreasury();
        return FederationTreasury.instance;
    }

    isReady(): boolean      { return this._ready; }
    get ownerId(): string   { if (!this._ready) throw new Error("FederationTreasury not ready"); return this._ownerId; }
    get accountId(): string { if (!this._ready) throw new Error("FederationTreasury not ready"); return this._accountId; }

    async init(bank: BankClient, loader: FederationTreasuryLoader): Promise<void> {
        this._bank = bank;

        if (loader.exists()) {
            const record = loader.load();
            this._ownerId   = record.ownerId;
            this._accountId = record.accountId;
            this._ready = true;
            return;
        }

        // First boot — register treasury institution and open kithe account
        const owner = await bank.createOwner("institution", "Federation Treasury", {
            ownerId: FEDERATION_TREASURY_ID,
        });
        this._ownerId = owner.ownerId;

        const account = await bank.openAccount(
            this._ownerId,
            "Federation Treasury",
            "kithe",
        );
        this._accountId = account.accountId;

        loader.save({
            ownerId:      this._ownerId,
            accountId:    this._accountId,
            registeredAt: new Date().toISOString(),
        });
        this._ready = true;
        console.log("[FederationTreasury] registered; account:", this._accountId);
    }

    /** Transfer kithe from the treasury to a recipient account (budget disbursement). */
    async transfer(toAccountId: string, amount: number, memo: string): Promise<void> {
        if (!this._ready) throw new Error("FederationTreasury not ready");
        await this._bank.transfer(this._accountId, toAccountId, amount, memo);
    }

    /** Deposit kithe into the treasury (levy collection, issuance). */
    async receive(fromAccountId: string, amount: number, memo: string): Promise<void> {
        if (!this._ready) throw new Error("FederationTreasury not ready");
        await this._bank.transfer(fromAccountId, this._accountId, amount, memo);
    }

    /** Current kithe balance of the treasury account. */
    async balance(): Promise<number> {
        if (!this._ready) throw new Error("FederationTreasury not ready");
        const account = await this._bank.getAccountById(this._accountId);
        return account?.amount ?? 0;
    }
}
