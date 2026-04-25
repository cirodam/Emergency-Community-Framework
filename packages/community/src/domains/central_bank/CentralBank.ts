import { BankClient } from "../../BankClient.js";
import { CentralBankLoader } from "./CentralBankLoader.js";

/**
 * The Central Bank is the sole issuer of kin.
 *
 * It holds one issuance account with overdraftLimit = -Infinity. Going negative
 * on this account means kin is in circulation; returning to zero means it has
 * all been retired.
 *
 * Lifecycle:
 *   1. On first boot, `init()` registers an institutional AccountOwner with the
 *      bank and opens the issuance account (overdraftLimit null → -Infinity).
 *   2. On subsequent boots, `init()` loads the persisted IDs and verifies
 *      the issuance account still exists.
 */
export class CentralBank {
    private static instance: CentralBank;

    private _ownerId!: string;
    private _issuanceAccountId!: string;
    private _bank!: BankClient;

    private constructor() {}

    static getInstance(): CentralBank {
        if (!CentralBank.instance) CentralBank.instance = new CentralBank();
        return CentralBank.instance;
    }

    get ownerId(): string           { return this._ownerId; }
    get issuanceAccountId(): string { return this._issuanceAccountId; }

    async init(bank: BankClient, loader: CentralBankLoader): Promise<void> {
        this._bank = bank;

        if (loader.exists()) {
            const record = loader.load();
            this._ownerId           = record.ownerId;
            this._issuanceAccountId = record.issuanceAccountId;
            return;
        }

        // First boot — register with the bank
        const owner = await bank.createOwner("institution", "Central Bank");
        this._ownerId = owner.ownerId;

        const account = await bank.openAccount(
            this._ownerId,
            "Central Bank",
            "kin",
            null, // null → overdraftLimit -Infinity on the bank side
        );
        this._issuanceAccountId = account.accountId;

        loader.save({
            ownerId:           this._ownerId,
            issuanceAccountId: this._issuanceAccountId,
            registeredAt:      new Date().toISOString(),
        });
    }

    // ── Money operations ────────────────────────────────────────────────────

    /**
     * Issue kin into circulation by transferring from the issuance account
     * (which may go arbitrarily negative) to a recipient account.
     */
    async issue(amount: number, recipientAccountId: string, memo = "kin issuance"): Promise<void> {
        await this._bank.transfer(this._issuanceAccountId, recipientAccountId, amount, memo);
    }

    /**
     * Retire kin from circulation by pulling it back into the issuance account.
     */
    async retire(amount: number, sourceAccountId: string, memo = "kin retirement"): Promise<void> {
        await this._bank.transfer(sourceAccountId, this._issuanceAccountId, amount, memo);
    }

    /**
     * Apply demurrage to all kin accounts. Collected fees flow into the
     * issuance account, effectively retiring that value from circulation.
     *
     * @param rate  Fraction of balance to collect, e.g. 0.02 = 2%
     * @param memo  Recorded on each generated transaction
     */
    async applyDemurrage(
        rate: number,
        memo = "kin demurrage",
        excludeAccountIds: string[] = [],
        floor = 0,
    ): Promise<{ count: number }> {
        return this._bank.applyDemurrage("kin", rate, this._issuanceAccountId, memo, floor, excludeAccountIds);
    }
}
