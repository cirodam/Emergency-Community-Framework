import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

export interface CentralBankRecord {
    ownerId: string;
    issuanceAccountId: string;
    registeredAt: string; // ISO 8601
}

/**
 * Persists the central bank's owner ID and issuance account ID.
 * Written once on first boot, read on every subsequent boot.
 */
export class CentralBankLoader {
    private readonly path: string;

    constructor(dataDir: string) {
        this.path = join(dataDir, "central_bank.json");
    }

    exists(): boolean {
        return existsSync(this.path);
    }

    save(record: CentralBankRecord): void {
        writeFileSync(this.path, JSON.stringify(record, null, 2), "utf-8");
    }

    load(): CentralBankRecord {
        if (!existsSync(this.path)) {
            throw new Error("[CentralBank] central_bank.json not found — call init() first");
        }
        return JSON.parse(readFileSync(this.path, "utf-8")) as CentralBankRecord;
    }
}
