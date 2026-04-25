import { BankAccount } from "./BankAccount.js";
import { FileStore } from "@ecf/core";
import { Currency } from "./BankTransaction.js";

interface PersistedRecord {
    accountId: string;
    ownerId: string;
    label: string;
    currency: Currency;
    amount: number;
    overdraftLimit: number;
    createdAt: string;
    // Backward-compat fields from older schema versions (read-only, never written)
    id?: string;               // old field name for accountId
    kin?: number;
    credits?: number;
    allowNegativeKin?: boolean;
    allowNegativeCredits?: boolean;
    exemptFromDemurrage?: boolean; // removed — governance concern
}

export class AccountLoader {
    private readonly store: FileStore;

    constructor(dataDir: string) {
        this.store = new FileStore(dataDir);
    }

    save(account: BankAccount): void {
        this.store.write(account.accountId, {
            accountId:      account.accountId,
            ownerId:        account.ownerId,
            label:          account.label,
            currency:       account.currency,
            amount:         account.amount,
            overdraftLimit: account.overdraftLimit,
            createdAt:      account.createdAt.toISOString(),
        });
    }

    loadAll(): BankAccount[] {
        return this.store.readAll<PersistedRecord>().map(r => this.fromRecord(r));
    }

    delete(id: string): boolean {
        return this.store.delete(id);
    }

    private fromRecord(r: PersistedRecord): BankAccount {
        // Backward compat: migrate old boolean overdraft flags → numeric limit
        let overdraftLimit: number;
        if (typeof r.overdraftLimit === "number") {
            overdraftLimit = r.overdraftLimit;
        } else if (r.overdraftLimit === null || r.allowNegativeKin === true || r.allowNegativeCredits === true) {
            overdraftLimit = -Infinity;
        } else {
            overdraftLimit = 0;
        }

        // Backward compat: old schema stored balance as "kin" or "credits"
        const amount = r.amount ?? r.kin ?? r.credits ?? 0;

        // Backward compat: old schema had no currency field — assume "kin"
        const currency: Currency = r.currency ?? "kin";

        // Backward compat: old records used "id" instead of "accountId"
        const accountId = r.accountId ?? r.id ?? "";

        return BankAccount.restore({
            accountId,
            ownerId:        r.ownerId,
            label:          r.label,
            currency,
            amount,
            overdraftLimit,
            createdAt:      new Date(r.createdAt),
        });
    }
}
