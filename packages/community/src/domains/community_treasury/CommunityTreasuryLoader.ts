import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

export interface CommunityTreasuryRecord {
    ownerId: string;
    accountId: string;
    registeredAt: string; // ISO 8601
}

export class CommunityTreasuryLoader {
    private readonly path: string;

    constructor(dataDir: string) {
        this.path = join(dataDir, "community_treasury.json");
    }

    exists(): boolean {
        return existsSync(this.path);
    }

    save(record: CommunityTreasuryRecord): void {
        writeFileSync(this.path, JSON.stringify(record, null, 2), "utf-8");
    }

    load(): CommunityTreasuryRecord {
        if (!existsSync(this.path)) {
            throw new Error("[CommunityTreasury] community_treasury.json not found — call init() first");
        }
        return JSON.parse(readFileSync(this.path, "utf-8")) as CommunityTreasuryRecord;
    }
}
