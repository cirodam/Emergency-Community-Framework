import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

export interface SocialInsuranceBankRecord {
    ownerId: string;
    poolAccountId: string;
    registeredAt: string; // ISO 8601
}

export class SocialInsuranceBankLoader {
    private readonly path: string;

    constructor(dataDir: string) {
        this.path = join(dataDir, "social_insurance_bank.json");
    }

    exists(): boolean {
        return existsSync(this.path);
    }

    save(record: SocialInsuranceBankRecord): void {
        writeFileSync(this.path, JSON.stringify(record, null, 2), "utf-8");
    }

    load(): SocialInsuranceBankRecord {
        if (!existsSync(this.path)) {
            throw new Error("[SocialInsuranceBank] social_insurance_bank.json not found — call init() first");
        }
        return JSON.parse(readFileSync(this.path, "utf-8")) as SocialInsuranceBankRecord;
    }
}
