import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

export interface FederationTreasuryRecord {
    ownerId: string;
    accountId: string;
    registeredAt: string; // ISO 8601
}

export class FederationTreasuryLoader {
    private readonly filePath: string;

    constructor(dataDir: string) {
        mkdirSync(dataDir, { recursive: true });
        this.filePath = join(dataDir, "federation_treasury.json");
    }

    exists(): boolean {
        return existsSync(this.filePath);
    }

    load(): FederationTreasuryRecord {
        return JSON.parse(readFileSync(this.filePath, "utf-8")) as FederationTreasuryRecord;
    }

    save(record: FederationTreasuryRecord): void {
        writeFileSync(this.filePath, JSON.stringify(record, null, 2), "utf-8");
    }
}
