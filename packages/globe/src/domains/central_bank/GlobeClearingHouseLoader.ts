import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

export interface GlobeClearingRecord {
    ownerId: string;
    structuralAidAccountId: string;
    solidarityPoolAccountId: string;
    registeredAt: string;
}

export class GlobeClearingHouseLoader {
    private readonly filePath: string;

    constructor(dataDir: string) {
        mkdirSync(dataDir, { recursive: true });
        this.filePath = join(dataDir, "globe_clearing_house.json");
    }

    exists(): boolean {
        return existsSync(this.filePath);
    }

    load(): GlobeClearingRecord {
        const raw = JSON.parse(readFileSync(this.filePath, "utf-8")) as Partial<GlobeClearingRecord>;
        return {
            ownerId:                 raw.ownerId                 ?? "",
            structuralAidAccountId:  raw.structuralAidAccountId  ?? "",
            solidarityPoolAccountId: raw.solidarityPoolAccountId ?? "",
            registeredAt:            raw.registeredAt            ?? new Date().toISOString(),
        };
    }

    save(record: GlobeClearingRecord): void {
        writeFileSync(this.filePath, JSON.stringify(record, null, 2), "utf-8");
    }
}
