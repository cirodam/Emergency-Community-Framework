import { BankClient } from "../../BankClient.js";
import type { FederationCentralBankLoader } from "./FederationCentralBankLoader.js";

export const FEDERATION_CENTRAL_BANK_ID = "ecf-federation-central-bank-000001";

/**
 * The Federation Central Bank is the sole issuer of kithe.
 *
 * Holds one issuance account with overdraftLimit = -Infinity.
 * A negative balance means kithe is in circulation.
 *
 * Issue kithe to member communities; retire it when it flows back.
 */
export class FederationCentralBank {
    private static instance: FederationCentralBank;

    private _ownerId!: string;
    private _issuanceAccountId!: string;
    private _bank!: BankClient;
    private _ready = false;

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

    async init(bank: BankClient, loader: FederationCentralBankLoader): Promise<void> {
        this._bank = bank;

        if (loader.exists()) {
            const record = loader.load();
            this._ownerId           = record.ownerId;
            this._issuanceAccountId = record.issuanceAccountId;
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

        loader.save({
            ownerId:           this._ownerId,
            issuanceAccountId: this._issuanceAccountId,
            registeredAt:      new Date().toISOString(),
        });
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
}
