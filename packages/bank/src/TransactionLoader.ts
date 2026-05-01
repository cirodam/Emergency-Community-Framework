import { createHash } from "crypto";
import { BankDb } from "./BankDb.js";
import { BankTransaction, Currency } from "./BankTransaction.js";

const GENESIS_HASH = "0".repeat(64);

export interface TransactionQuery {
    accountId?: string;
    month?: string; // YYYY-MM
    limit?: number;
    offset?: number;
}

interface TxRow {
    id:              string;
    from_account_id: string;
    to_account_id:   string;
    currency:        string;
    amount:          number; // integer cents
    memo:            string;
    timestamp:       string;
    reversal_of:     string | null;
    previous_hash:   string | null;
    hash:            string | null;
}

function toCents(n: number): number {
    return Math.round(n * 100);
}

function fromCents(n: number): number {
    return n / 100;
}

function computeHash(row: Omit<TxRow, "hash">): string {
    const payload = JSON.stringify({
        id:              row.id,
        from_account_id: row.from_account_id,
        to_account_id:   row.to_account_id,
        currency:        row.currency,
        amount:          row.amount,
        memo:            row.memo,
        timestamp:       row.timestamp,
        reversal_of:     row.reversal_of,
        previous_hash:   row.previous_hash,
    });
    return createHash("sha256").update(payload, "utf-8").digest("hex");
}

export class TransactionLoader {
    private get db() { return BankDb.getInstance().db; }

    // ── Write ─────────────────────────────────────────────────────────────────

    /** Append a transaction, chaining it to the previous head. */
    save(tx: BankTransaction): void {
        const previousHash = this.readChainHead();
        const row: Omit<TxRow, "hash"> = {
            id:              tx.id,
            from_account_id: tx.fromAccountId,
            to_account_id:   tx.toAccountId,
            currency:        tx.currency,
            amount:          toCents(tx.amount),
            memo:            tx.memo,
            timestamp:       tx.timestamp.toISOString(),
            reversal_of:     tx.reversalOf ?? null,
            previous_hash:   previousHash,
        };
        const hash = computeHash(row);

        this.db.prepare(`
            INSERT INTO transactions
                (id, from_account_id, to_account_id, currency, amount, memo, timestamp, reversal_of, previous_hash, hash)
            VALUES
                (@id, @from_account_id, @to_account_id, @currency, @amount, @memo, @timestamp, @reversal_of, @previous_hash, @hash)
        `).run({ ...row, hash });

        this.writeChainHead(hash);
    }

    // ── Read ──────────────────────────────────────────────────────────────────

    getById(id: string): BankTransaction | undefined {
        const row = this.db.prepare(
            "SELECT * FROM transactions WHERE id = ?"
        ).get(id) as TxRow | undefined;
        return row ? this.fromRow(row) : undefined;
    }

    query(options: TransactionQuery = {}): BankTransaction[] {
        const conditions: string[] = [];
        const params: Record<string, unknown> = {};

        if (options.accountId) {
            conditions.push("(from_account_id = @accountId OR to_account_id = @accountId)");
            params.accountId = options.accountId;
        }
        if (options.month) {
            conditions.push("strftime('%Y-%m', timestamp) = @month");
            params.month = options.month;
        }

        const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
        const limit  = options.limit  != null ? `LIMIT ${options.limit}`   : "";
        const offset = options.offset != null ? `OFFSET ${options.offset}` : "";

        const rows = this.db.prepare(
            `SELECT * FROM transactions ${where} ORDER BY timestamp ASC ${limit} ${offset}`
        ).all(params) as TxRow[];

        return rows.map(r => this.fromRow(r));
    }

    count(options: Pick<TransactionQuery, "accountId" | "month"> = {}): number {
        const conditions: string[] = [];
        const params: Record<string, unknown> = {};

        if (options.accountId) {
            conditions.push("(from_account_id = @accountId OR to_account_id = @accountId)");
            params.accountId = options.accountId;
        }
        if (options.month) {
            conditions.push("strftime('%Y-%m', timestamp) = @month");
            params.month = options.month;
        }

        const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
        const result = this.db.prepare(
            `SELECT COUNT(*) as n FROM transactions ${where}`
        ).get(params) as { n: number };
        return result.n;
    }

    // ── Chain ─────────────────────────────────────────────────────────────────

    private readChainHead(): string {
        const row = this.db.prepare(
            "SELECT value FROM meta WHERE key = 'chain_head'"
        ).get() as { value: string } | undefined;
        return row?.value ?? GENESIS_HASH;
    }

    private writeChainHead(hash: string): void {
        this.db.prepare(
            "INSERT INTO meta (key, value) VALUES ('chain_head', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
        ).run(hash);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private fromRow(r: TxRow): BankTransaction {
        return BankTransaction.restore(
            r.id,
            r.from_account_id,
            r.to_account_id,
            r.currency as Currency,
            fromCents(r.amount),
            r.memo,
            new Date(r.timestamp),
            r.reversal_of ?? undefined,
        );
    }
}
