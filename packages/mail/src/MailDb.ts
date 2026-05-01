import Database from "better-sqlite3";
import { mkdirSync } from "fs";
import { join, dirname } from "path";

export class MailDb {
    private static instance: MailDb;
    readonly db: Database.Database;

    private constructor(dataDir: string) {
        const dbPath = join(dataDir, "mail.db");
        mkdirSync(dirname(dbPath), { recursive: true });

        this.db = new Database(dbPath);
        this.db.pragma("journal_mode = WAL");
        this.db.pragma("foreign_keys = ON");
        this.db.pragma("synchronous = NORMAL");
        this.applySchema();
    }

    static init(dataDir: string): MailDb {
        if (MailDb.instance) throw new Error("MailDb already initialized");
        MailDb.instance = new MailDb(dataDir);
        return MailDb.instance;
    }

    static getInstance(): MailDb {
        if (!MailDb.instance) throw new Error("MailDb.init() must be called before getInstance()");
        return MailDb.instance;
    }

    private applySchema(): void {
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS messages (
                id   TEXT PRIMARY KEY,
                data TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS threads (
                id   TEXT PRIMARY KEY,
                data TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS receipts (
                id   TEXT PRIMARY KEY,
                data TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS reports (
                id   TEXT PRIMARY KEY,
                data TEXT NOT NULL
            );
        `);
    }
}
