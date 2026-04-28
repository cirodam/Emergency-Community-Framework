import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

export interface ClearingRecord {
    ownerId: string;
    /** Issuance account kept for structural-aid grants from the clearing house itself. */
    issuanceAccountId: string;
    /** Receives the solidarity fraction of demurrage charges; redistributed monthly to deficit communities. */
    solidarityPoolAccountId: string;
    registeredAt: string;
}

export class FederationClearingHouseLoader {
    private readonly filePath: string;

    constructor(dataDir: string) {
        mkdirSync(dataDir, { recursive: true });
        // Keep the same filename so existing deployments don't need a data migration.
        this.filePath = join(dataDir, "federation_central_bank.json");
    }

    exists(): boolean {
        return existsSync(this.filePath);
    }

    load(): ClearingRecord {
        const raw = JSON.parse(readFileSync(this.filePath, "utf-8")) as Partial<ClearingRecord>;
        return {
            ownerId:                 raw.ownerId                 ?? "",
            issuanceAccountId:       raw.issuanceAccountId       ?? "",
            solidarityPoolAccountId: raw.solidarityPoolAccountId ?? "",
            registeredAt:            raw.registeredAt            ?? new Date().toISOString(),
        };
    }

    save(record: ClearingRecord): void {
        writeFileSync(this.filePath, JSON.stringify(record, null, 2), "utf-8");
    }
}
