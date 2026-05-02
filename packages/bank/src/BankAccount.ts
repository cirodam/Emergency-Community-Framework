import { randomUUID } from "crypto";
import { IEconomicActor } from "@ecf/core";
import { Currency } from "./BankTransaction.js";

export interface AccountRecord {
    accountId: string;
    ownerId: string;
    label: string;
    currency: Currency;
    amount: number;
    overdraftLimit: number;
    createdAt: Date;
    handle: string;
    primary: boolean;
}

export class BankAccount {
    readonly accountId: string;
    readonly ownerId: string;
    label: string;
    /** URL-safe handle unique per owner, e.g. "savings", "household". */
    handle: string;
    /** True for the owner's default account — resolved when no account handle is given. */
    primary: boolean;
    readonly currency: Currency;
    /**
     * The minimum balance allowed (inclusive). Debits that would push the balance below
     * this value are rejected. Use -Infinity for accounts with no floor
     * (e.g. the central bank issuing account).
     */
    readonly overdraftLimit: number;
    readonly createdAt: Date;

    private _amount: number = 0;
    get amount(): number { return this._amount; }

    /** Convenience alias — kin accounts used this name historically. */
    get kin(): number { return this._amount; }

    constructor(
        owner: IEconomicActor,
        label: string,
        currency: Currency,
        overdraftLimit: number = 0,
        handle: string = "",
        primary: boolean = false,
    ) {
        this.accountId = randomUUID();
        this.ownerId = owner.getId();
        this.label = label;
        this.handle = handle || label.toLowerCase().replace(/[^a-z0-9_]/g, "_");
        this.primary = primary;
        this.currency = currency;
        this.overdraftLimit = overdraftLimit;
        this.createdAt = new Date();
    }

    /** Add to this account's balance. Called only by Bank. */
    credit(amount: number): void {
        this._amount = Math.round((this._amount + amount) * 100) / 100;
    }

    /** Subtract from this account's balance. Called only by Bank. */
    debit(amount: number): void {
        this._amount = Math.round((this._amount - amount) * 100) / 100;
    }

    /**
     * Restore a persisted account without generating a new UUID or timestamp.
     * For use by AccountLoader only.
     */
    static restore(r: AccountRecord): BankAccount {
        const stub: IEconomicActor = { getId: () => r.ownerId, getDisplayName: () => "", getHandle: () => "" };
        const account = new BankAccount(stub, r.label, r.currency, r.overdraftLimit, r.handle, r.primary);
        const a = account as unknown as Record<string, unknown>;
        a["accountId"] = r.accountId;
        a["ownerId"]   = r.ownerId;
        a["createdAt"] = r.createdAt;
        account._amount = r.amount;
        return account;
    }
}
