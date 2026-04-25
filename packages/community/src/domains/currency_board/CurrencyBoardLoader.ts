import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

export interface CurrencyBoardRecord {
    ownerId: string;
    issuanceAccountId: string;
    registeredAt: string; // ISO 8601
}

export class CurrencyBoardLoader {
    private readonly path: string;

    constructor(dataDir: string) {
        this.path = join(dataDir, "currency_board.json");
    }

    exists(): boolean {
        return existsSync(this.path);
    }

    save(record: CurrencyBoardRecord): void {
        writeFileSync(this.path, JSON.stringify(record, null, 2), "utf-8");
    }

    load(): CurrencyBoardRecord {
        if (!existsSync(this.path)) {
            throw new Error("[CurrencyBoard] currency_board.json not found — call init() first");
        }
        return JSON.parse(readFileSync(this.path, "utf-8")) as CurrencyBoardRecord;
    }
}
