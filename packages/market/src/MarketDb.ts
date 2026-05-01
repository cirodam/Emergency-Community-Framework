import Database from "better-sqlite3";
import { mkdirSync } from "fs";
import { join, dirname } from "path";

export class MarketDb {
    private static instance: MarketDb;
    readonly db: Database.Database;

    private constructor(dataDir: string) {
        const dbPath = join(dataDir, "market.db");
        mkdirSync(dirname(dbPath), { recursive: true });

        this.db = new Database(dbPath);
        this.db.pragma("journal_mode = WAL");
        this.db.pragma("foreign_keys = ON");
        this.db.pragma("synchronous = NORMAL");
        this.applySchema();
    }

    static init(dataDir: string): MarketDb {
        if (MarketDb.instance) throw new Error("MarketDb already initialized");
        MarketDb.instance = new MarketDb(dataDir);
        return MarketDb.instance;
    }

    static getInstance(): MarketDb {
        if (!MarketDb.instance) throw new Error("MarketDb.init() must be called before getInstance()");
        return MarketDb.instance;
    }

    private applySchema(): void {
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS classifieds (
                id   TEXT PRIMARY KEY,
                data TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS stalls (
                id   TEXT PRIMARY KEY,
                data TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS service_profiles (
                id   TEXT PRIMARY KEY,
                data TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS marketplaces (
                id   TEXT PRIMARY KEY,
                data TEXT NOT NULL
            );
        `);
    }
}
