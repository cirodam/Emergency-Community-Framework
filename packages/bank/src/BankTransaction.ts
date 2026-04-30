import { randomUUID } from "crypto";

export type Currency = "kin" | "kithe";

export class BankTransaction {
    readonly id: string;
    readonly fromAccountId: string;
    readonly toAccountId: string;
    readonly currency: Currency;
    readonly amount: number;
    readonly memo: string;
    readonly timestamp: Date;
    /** ID of the original transaction this record reverses, if applicable. */
    readonly reversalOf?: string;

    constructor(
        fromAccountId: string,
        toAccountId: string,
        currency: Currency,
        amount: number,
        memo: string = "",
        reversalOf?: string,
    ) {
        this.id = randomUUID();
        this.fromAccountId = fromAccountId;
        this.toAccountId = toAccountId;
        this.currency = currency;
        this.amount = amount;
        this.memo = memo;
        this.timestamp = new Date();
        if (reversalOf) (this as unknown as Record<string, unknown>)["reversalOf"] = reversalOf;
    }

    /**
     * Restore a persisted transaction without generating a new UUID or timestamp.
     * For use by TransactionLoader only.
     */
    static restore(
        id: string,
        fromAccountId: string,
        toAccountId: string,
        currency: Currency,
        amount: number,
        memo: string,
        timestamp: Date,
        reversalOf?: string,
    ): BankTransaction {
        const tx = new BankTransaction(fromAccountId, toAccountId, currency, amount, memo);
        const t = tx as unknown as Record<string, unknown>;
        t["id"] = id;
        t["timestamp"] = timestamp;
        if (reversalOf) t["reversalOf"] = reversalOf;
        return tx;
    }
}
