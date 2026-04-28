import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

export interface CommonwealthTreasuryRecord {
    ownerId: string;
    accountId: string;
    registeredAt: string;
}

export class CommonwealthTreasuryLoader {
    private readonly filePath: string;

    constructor(dataDir: string) {
        mkdirSync(dataDir, { recursive: true });
        this.filePath = join(dataDir, "commonwealth_treasury.json");
    }

    exists(): boolean {
        return existsSync(this.filePath);
    }

    load(): CommonwealthTreasuryRecord {
        return JSON.parse(readFileSync(this.filePath, "utf-8")) as CommonwealthTreasuryRecord;
    }

    save(record: CommonwealthTreasuryRecord): void {
        writeFileSync(this.filePath, JSON.stringify(record, null, 2), "utf-8");
    }
}
