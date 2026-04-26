import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

export type FederationApplicationStatus =
    | "draft" | "submitted" | "under_review" | "approved" | "rejected";

export interface FederationMembership {
    /** URL of the federation node, e.g. http://federation:3010 */
    federationUrl:       string;
    /** Application ID returned by the federation on submit */
    applicationId:       string;
    /** Set once the federation approves and creates the member record */
    memberId:            string | null;
    /** The account ID at the federation bank (set on approval) */
    federationAccountId: string | null;
    status:              FederationApplicationStatus;
    appliedAt:           string; // ISO 8601
}

export interface CurrencyBoardRecord {
    ownerId:           string;
    issuanceAccountId: string;
    registeredAt:      string; // ISO 8601
    /** Populated once the community applies to join a federation. */
    federation:        FederationMembership | null;
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
        const raw = JSON.parse(readFileSync(this.path, "utf-8")) as CurrencyBoardRecord;
        // Merge defaults for fields added after initial record was written
        return { federation: null, ...raw };
    }
}
