import { randomUUID } from "crypto";
import { IEconomicActor } from "@ecf/core";

export interface AccountRecord {
    id: string;
    ownerId: string;
    label: string;
    kin: number;
    overdraftLimit: number;
    exemptFromDemurrage: boolean;
    createdAt: Date;
}

export class BankAccount {
    readonly id: string;
    readonly ownerId: string;
    readonly label: string;
    /**
     * The minimum balance allowed (inclusive). Debits that would push kin below
     * this value are rejected. Use -Infinity for accounts with no floor
     * (e.g. the central bank issuing account).
     */
    readonly overdraftLimit: number;
    readonly exemptFromDemurrage: boolean;
    readonly createdAt: Date;

    private _kin: number = 0;
    get kin(): number { return this._kin; }

    constructor(owner: IEconomicActor, label: string, overdraftLimit: number = 0, exemptFromDemurrage: boolean = false) {
        this.id = randomUUID();
        this.ownerId = owner.getId();
        this.label = label;
        this.overdraftLimit = overdraftLimit;
        this.exemptFromDemurrage = exemptFromDemurrage;
        this.createdAt = new Date();
    }

    /** Add kin to this account. Called only by Bank. */
    credit(amount: number): void {
        this._kin = Math.round((this._kin + amount) * 100) / 100;
    }

    /** Subtract kin from this account. Called only by Bank. */
    debit(amount: number): void {
        this._kin = Math.round((this._kin - amount) * 100) / 100;
    }

    /**
     * Restore a persisted account without generating a new UUID or timestamp.
     * For use by AccountLoader only.
     */
    static restore(r: AccountRecord): BankAccount {
        const stub: IEconomicActor = { getId: () => r.ownerId, getDisplayName: () => "", getHandle: () => "" };
        const account = new BankAccount(stub, r.label, r.overdraftLimit, r.exemptFromDemurrage);
        const a = account as unknown as Record<string, unknown>;
        a["id"] = r.id;
        a["ownerId"] = r.ownerId;
        a["createdAt"] = r.createdAt;
        account._kin = r.kin;
        return account;
    }
}
