import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

interface GlobeTreasuryRecord {
    ownerId: string;
    accountId: string;
    registeredAt: string;
}

export const GLOBE_TREASURY_ID = "ecf-globe-treasury-000002";

import { BankClient } from "../../BankClient.js";

export class GlobeTreasuryLoader {
    private readonly filePath: string;

    constructor(dataDir: string) {
        mkdirSync(dataDir, { recursive: true });
        this.filePath = join(dataDir, "globe_treasury.json");
    }

    exists(): boolean {
        return existsSync(this.filePath);
    }

    load(): GlobeTreasuryRecord {
        const raw = JSON.parse(readFileSync(this.filePath, "utf-8")) as Partial<GlobeTreasuryRecord>;
        return {
            ownerId:      raw.ownerId      ?? "",
            accountId:    raw.accountId    ?? "",
            registeredAt: raw.registeredAt ?? new Date().toISOString(),
        };
    }

    save(record: GlobeTreasuryRecord): void {
        writeFileSync(this.filePath, JSON.stringify(record, null, 2), "utf-8");
    }
}
