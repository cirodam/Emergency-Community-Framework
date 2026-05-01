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

            -- Unsent drafts (per person)
            CREATE TABLE IF NOT EXISTS drafts (
                id          TEXT PRIMARY KEY,
                person_id   TEXT NOT NULL,
                data        TEXT NOT NULL,
                updated_at  TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_drafts_person ON drafts(person_id);

            -- Per-person thread state (archived flag)
            CREATE TABLE IF NOT EXISTS thread_states (
                thread_id TEXT NOT NULL,
                person_id TEXT NOT NULL,
                archived  INTEGER NOT NULL DEFAULT 0,
                PRIMARY KEY (thread_id, person_id)
            );
            CREATE INDEX IF NOT EXISTS idx_thread_states_person ON thread_states(person_id);

            -- Full-text search virtual table over messages
            CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(
                id UNINDEXED,
                subject,
                body,
                content=messages,
                content_rowid=rowid
            );
        `);

        // Keep FTS in sync — only create triggers if they don't already exist
        this.db.exec(`
            CREATE TRIGGER IF NOT EXISTS messages_ai AFTER INSERT ON messages BEGIN
                INSERT INTO messages_fts(rowid, id, subject, body)
                VALUES (new.rowid, new.id,
                        json_extract(new.data, '$.subject'),
                        json_extract(new.data, '$.body'));
            END;

            CREATE TRIGGER IF NOT EXISTS messages_ad AFTER DELETE ON messages BEGIN
                INSERT INTO messages_fts(messages_fts, rowid, id, subject, body)
                VALUES ('delete', old.rowid, old.id,
                        json_extract(old.data, '$.subject'),
                        json_extract(old.data, '$.body'));
            END;

            CREATE TRIGGER IF NOT EXISTS messages_au AFTER UPDATE ON messages BEGIN
                INSERT INTO messages_fts(messages_fts, rowid, id, subject, body)
                VALUES ('delete', old.rowid, old.id,
                        json_extract(old.data, '$.subject'),
                        json_extract(old.data, '$.body'));
                INSERT INTO messages_fts(rowid, id, subject, body)
                VALUES (new.rowid, new.id,
                        json_extract(new.data, '$.subject'),
                        json_extract(new.data, '$.body'));
            END;
        `);
    }
}
