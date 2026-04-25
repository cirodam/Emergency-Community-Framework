import { BankAccount } from "./BankAccount.js";
import { FileStore } from "@ecf/core";

interface PersistedRecord {
    id: string;
    ownerId: string;
    label: string;
    kin: number;
    overdraftLimit: number;
    exemptFromDemurrage: boolean;
    createdAt: string;
    // Backward-compat fields from older schema versions (read-only, never written)
    credits?: number;
    allowNegativeKin?: boolean;
    allowNegativeCredits?: boolean;
}

export class AccountLoader {
    private readonly store: FileStore;

    constructor(dataDir: string) {
        this.store = new FileStore(dataDir);
    }

    save(account: BankAccount): void {
        this.store.write(account.id, {
            id:                  account.id,
            ownerId:             account.ownerId,
            label:               account.label,
            kin:                 account.kin,
            overdraftLimit:      account.overdraftLimit,
            exemptFromDemurrage: account.exemptFromDemurrage,
            createdAt:           account.createdAt.toISOString(),
        });
    }

    loadAll(): BankAccount[] {
        return this.store.readAll<PersistedRecord>().map(r => this.fromRecord(r));
    }

    delete(accountId: string): boolean {
        return this.store.delete(accountId);
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

        // Backward compat: old schema used "credits" instead of "kin"
        const kin = r.kin ?? r.credits ?? 0;

        return BankAccount.restore({
            id:                  r.id,
            ownerId:             r.ownerId,
            label:               r.label,
            kin,
            overdraftLimit,
            exemptFromDemurrage: r.exemptFromDemurrage,
            createdAt:           new Date(r.createdAt),
        });
    }
}
