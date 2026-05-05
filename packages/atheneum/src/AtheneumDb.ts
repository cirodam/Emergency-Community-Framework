import Database from "better-sqlite3";
import { mkdirSync } from "fs";
import { join, dirname } from "path";

export class AtheneumDb {
    private static instance: AtheneumDb;
    readonly db: Database.Database;

    private constructor(dataDir: string) {
        const dbPath = join(dataDir, "atheneum.db");
        mkdirSync(dirname(dbPath), { recursive: true });

        this.db = new Database(dbPath);
        this.db.pragma("journal_mode = WAL");
        this.db.pragma("foreign_keys = ON");
        this.db.pragma("synchronous = NORMAL");
        this.applySchema();
    }

    static init(dataDir: string): AtheneumDb {
        if (AtheneumDb.instance) throw new Error("AtheneumDb already initialized");
        AtheneumDb.instance = new AtheneumDb(dataDir);
        return AtheneumDb.instance;
    }

    static getInstance(): AtheneumDb {
        if (!AtheneumDb.instance) throw new Error("AtheneumDb.init() must be called before getInstance()");
        return AtheneumDb.instance;
    }

    private applySchema(): void {
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS sessions (
                id   TEXT PRIMARY KEY,
                data TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS courses (
                id   TEXT PRIMARY KEY,
                data TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS class_requests (
                id   TEXT PRIMARY KEY,
                data TEXT NOT NULL
            );
        `);
    }
}
