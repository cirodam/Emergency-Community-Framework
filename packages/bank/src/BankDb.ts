import Database from "better-sqlite3";
import { mkdirSync } from "fs";
import { join, dirname } from "path";

/**
 * Singleton wrapper around the bank's SQLite database.
 *
 * All bank loaders and the Bank service obtain the db via BankDb.getInstance().db.
 * WAL mode is enabled for concurrent read performance.
 * Schema is created idempotently on first open — safe to call every boot.
 */
export class BankDb {
    private static instance: BankDb;
    readonly db: Database.Database;

    private constructor(dataDir: string) {
        const dbPath = join(dataDir, "bank.db");
        mkdirSync(dirname(dbPath), { recursive: true });

        this.db = new Database(dbPath);
        this.db.pragma("journal_mode = WAL");
        this.db.pragma("foreign_keys = ON");
        this.db.pragma("synchronous = NORMAL"); // safe with WAL; faster than FULL
        this.applySchema();
    }

    static init(dataDir: string): BankDb {
        if (BankDb.instance) throw new Error("BankDb already initialized");
        BankDb.instance = new BankDb(dataDir);
        return BankDb.instance;
    }

    static getInstance(): BankDb {
        if (!BankDb.instance) throw new Error("BankDb.init() must be called before getInstance()");
        return BankDb.instance;
    }

    private applySchema(): void {
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS accounts (
                account_id      TEXT PRIMARY KEY,
                owner_id        TEXT NOT NULL,
                label           TEXT NOT NULL,
                currency        TEXT NOT NULL CHECK(currency IN ('kin','kithe')),
                amount          INTEGER NOT NULL DEFAULT 0,
                overdraft_limit INTEGER NOT NULL DEFAULT 0,
                created_at      TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_accounts_owner ON accounts(owner_id);

            CREATE TABLE IF NOT EXISTS account_owners (
                owner_id      TEXT PRIMARY KEY,
                owner_type    TEXT NOT NULL,
                display_name  TEXT NOT NULL,
                created_at    TEXT NOT NULL,
                phone         TEXT,
                password_hash TEXT,
                pin_hash      TEXT,
                public_key_hex TEXT
            );

            CREATE TABLE IF NOT EXISTS transactions (
                id              TEXT PRIMARY KEY,
                from_account_id TEXT NOT NULL,
                to_account_id   TEXT NOT NULL,
                currency        TEXT NOT NULL,
                amount          INTEGER NOT NULL,
                memo            TEXT NOT NULL DEFAULT '',
                timestamp       TEXT NOT NULL,
                reversal_of     TEXT,
                previous_hash   TEXT,
                hash            TEXT
            );

            CREATE INDEX IF NOT EXISTS idx_tx_from      ON transactions(from_account_id);
            CREATE INDEX IF NOT EXISTS idx_tx_to        ON transactions(to_account_id);
            CREATE INDEX IF NOT EXISTS idx_tx_timestamp ON transactions(timestamp);

            CREATE TABLE IF NOT EXISTS charter (
                id           INTEGER PRIMARY KEY CHECK(id = 1),
                owner_node_id TEXT NOT NULL,
                owner_type    TEXT NOT NULL,
                chartered_at  TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS meta (
                key   TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );
        `);
    }
}
