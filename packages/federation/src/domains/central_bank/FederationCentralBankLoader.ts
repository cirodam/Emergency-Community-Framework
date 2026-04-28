import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

export interface SupplySettlementRecord {
    /** ISO 8601 timestamp of when the settlement ran. */
    settledAt: string;
    /** Unique member count used for this settlement. */
    uniqueMembers: number;
    /** Target kithe in circulation at settlement time. */
    targetSupply: number;
    /** Actual kithe in circulation just before settlement. */
    actualCirculation: number;
    /** Net kithe issued (positive) or retired (negative) by this settlement. */
    netAdjustment: number;
}

interface FederationCentralBankRecord {
    ownerId: string;
    issuanceAccountId: string;
    registeredAt: string;
    /** ISO 8601 date of the last monthly settlement, or null if never run. */
    lastSettlementDate: string | null;
    /** History of the last 24 monthly settlements (most-recent last). */
    settlementHistory: SupplySettlementRecord[];
}

export class FederationCentralBankLoader {
    private readonly filePath: string;

    constructor(dataDir: string) {
        mkdirSync(dataDir, { recursive: true });
        this.filePath = join(dataDir, "federation_central_bank.json");
    }

    exists(): boolean {
        return existsSync(this.filePath);
    }

    load(): FederationCentralBankRecord {
        const raw = JSON.parse(readFileSync(this.filePath, "utf-8")) as Partial<FederationCentralBankRecord>;
        return {
            ownerId:            raw.ownerId            ?? "",
            issuanceAccountId:  raw.issuanceAccountId  ?? "",
            registeredAt:       raw.registeredAt       ?? new Date().toISOString(),
            lastSettlementDate: raw.lastSettlementDate ?? null,
            settlementHistory:  raw.settlementHistory  ?? [],
        };
    }

    save(record: FederationCentralBankRecord): void {
        writeFileSync(this.filePath, JSON.stringify(record, null, 2), "utf-8");
    }
}
