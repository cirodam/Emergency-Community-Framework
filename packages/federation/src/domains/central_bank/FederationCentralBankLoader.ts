import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

interface FederationCentralBankRecord {
    ownerId: string;
    issuanceAccountId: string;
    registeredAt: string;
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
        return JSON.parse(readFileSync(this.filePath, "utf-8")) as FederationCentralBankRecord;
    }

    save(record: FederationCentralBankRecord): void {
        writeFileSync(this.filePath, JSON.stringify(record, null, 2), "utf-8");
    }
}
