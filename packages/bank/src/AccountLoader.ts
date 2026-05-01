import { BankAccount } from "./BankAccount.js";
import { BankDb } from "./BankDb.js";
import { Currency } from "./BankTransaction.js";

interface AccountRow {
    account_id:      string;
    owner_id:        string;
    label:           string;
    currency:        string;
    amount:          number; // integer cents
    overdraft_limit: number; // integer cents; -999999999999 sentinel for -Infinity
    created_at:      string;
}

const INF_SENTINEL = -999_999_999_999;

function toCents(n: number): number {
    if (!Number.isFinite(n)) return INF_SENTINEL;
    return Math.round(n * 100);
}

function fromCents(n: number): number {
    if (n === INF_SENTINEL) return -Infinity;
    return n / 100;
}

export class AccountLoader {
    private get db() { return BankDb.getInstance().db; }

    save(account: BankAccount): void {
        this.db.prepare(`
            INSERT INTO accounts (account_id, owner_id, label, currency, amount, overdraft_limit, created_at)
            VALUES (@account_id, @owner_id, @label, @currency, @amount, @overdraft_limit, @created_at)
            ON CONFLICT(account_id) DO UPDATE SET
                label           = excluded.label,
                amount          = excluded.amount,
                overdraft_limit = excluded.overdraft_limit
        `).run({
            account_id:      account.accountId,
            owner_id:        account.ownerId,
            label:           account.label,
            currency:        account.currency,
            amount:          toCents(account.amount),
            overdraft_limit: toCents(account.overdraftLimit),
            created_at:      account.createdAt.toISOString(),
        });
    }

    loadAll(): BankAccount[] {
        return (this.db.prepare("SELECT * FROM accounts").all() as AccountRow[])
            .map(r => this.fromRow(r));
    }

    delete(id: string): boolean {
        const result = this.db.prepare("DELETE FROM accounts WHERE account_id = ?").run(id);
        return result.changes > 0;
    }

    private fromRow(r: AccountRow): BankAccount {
        return BankAccount.restore({
            accountId:      r.account_id,
            ownerId:        r.owner_id,
            label:          r.label,
            currency:       r.currency as Currency,
            amount:         fromCents(r.amount),
            overdraftLimit: fromCents(r.overdraft_limit),
            createdAt:      new Date(r.created_at),
        });
    }
}

