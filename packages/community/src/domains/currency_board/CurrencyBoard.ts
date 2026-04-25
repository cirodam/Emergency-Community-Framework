import { BankClient } from "../../BankClient.js";
import { CurrencyBoardLoader } from "./CurrencyBoardLoader.js";

/**
 * The Currency Board is the sole issuer of kithe.
 *
 * Kithe is a stable, reserve-backed currency. The currency board issues kithe
 * only against deposited reserves (e.g. kin, goods, labour pledges) and
 * retires kithe when reserves are withdrawn.
 *
 * Like the central bank for kin, the currency board holds one issuance account
 * with overdraftLimit = -Infinity. Negative balance = kithe in circulation.
 *
 * Lifecycle: identical to CentralBank — first boot registers the institution
 * with the bank and opens the issuance account; subsequent boots load from disk.
 */
export class CurrencyBoard {
    private static instance: CurrencyBoard;

    private _ownerId!: string;
    private _issuanceAccountId!: string;
    private _bank!: BankClient;
    private _ready = false;

    private constructor() {}

    static getInstance(): CurrencyBoard {
        if (!CurrencyBoard.instance) CurrencyBoard.instance = new CurrencyBoard();
        return CurrencyBoard.instance;
    }

    isReady(): boolean              { return this._ready; }
    get ownerId(): string           { if (!this._ready) throw new Error("CurrencyBoard not ready"); return this._ownerId; }
    get issuanceAccountId(): string { if (!this._ready) throw new Error("CurrencyBoard not ready"); return this._issuanceAccountId; }

    async init(bank: BankClient, loader: CurrencyBoardLoader): Promise<void> {
        this._bank = bank;

        if (loader.exists()) {
            const record = loader.load();
            this._ownerId           = record.ownerId;
            this._issuanceAccountId = record.issuanceAccountId;
            this._ready = true;
            return;
        }

        // First boot — register with the bank
        const owner = await bank.createOwner("institution", "Currency Board");
        this._ownerId = owner.ownerId;

        const account = await bank.openAccount(
            this._ownerId,
            "Currency Board",
            "kithe",
            null, // null → overdraftLimit -Infinity on the bank side
        );
        this._issuanceAccountId = account.accountId;

        loader.save({
            ownerId:           this._ownerId,
            issuanceAccountId: this._issuanceAccountId,
            registeredAt:      new Date().toISOString(),
        });
        this._ready = true;
    }

    // ── Money operations ────────────────────────────────────────────────────

    /**
     * Issue kithe into circulation against deposited reserves.
     * The issuance account may go arbitrarily negative — each unit below zero
     * represents one kithe unit in circulation.
     */
    async issue(amount: number, recipientAccountId: string, memo = "kithe issuance"): Promise<void> {
        await this._bank.transfer(this._issuanceAccountId, recipientAccountId, amount, memo);
    }

    /**
     * Retire kithe from circulation when reserves are withdrawn.
     */
    async retire(amount: number, sourceAccountId: string, memo = "kithe retirement"): Promise<void> {
        await this._bank.transfer(sourceAccountId, this._issuanceAccountId, amount, memo);
    }

    /**
     * Apply demurrage to all kithe accounts. Collected fees flow into the
     * issuance account, reducing the outstanding supply.
     *
     * @param rate  Fraction of balance to collect, e.g. 0.02 = 2%
     * @param memo  Recorded on each generated transaction
     */
    async applyDemurrage(
        rate: number,
        memo = "kithe demurrage",
        excludeAccountIds: string[] = [],
        floor = 0,
    ): Promise<{ count: number }> {
        return this._bank.applyDemurrage("kithe", rate, this._issuanceAccountId, memo, floor, excludeAccountIds);
    }
}
