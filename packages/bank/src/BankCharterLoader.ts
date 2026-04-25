import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

export type CharterOwnerType = "community" | "federation";

export interface BankCharter {
    ownerNodeId: string;
    ownerType: CharterOwnerType;
    charteredAt: string; // ISO 8601
}

/**
 * Loads and persists the bank's charter — the single record identifying which
 * community or federation governs this bank.
 *
 * On first boot the charter is written from env vars and locked.
 * On subsequent boots the persisted charter is loaded and validated against
 * the env vars (they must match, or startup is aborted).
 */
export class BankCharterLoader {
    private readonly path: string;

    constructor(dataDir: string) {
        this.path = join(dataDir, "charter.json");
    }

    /**
     * Load the charter from disk, or create it from the provided values if it
     * does not yet exist. Throws if the persisted charter conflicts with the
     * provided values.
     */
    load(ownerNodeId: string, ownerType: CharterOwnerType): BankCharter {
        if (existsSync(this.path)) {
            const existing = JSON.parse(readFileSync(this.path, "utf-8")) as BankCharter;
            if (existing.ownerNodeId !== ownerNodeId) {
                throw new Error(
                    `[bank] charter conflict: persisted ownerNodeId "${existing.ownerNodeId}" ` +
                    `does not match env OWNER_NODE_ID "${ownerNodeId}". ` +
                    `Delete charter.json to re-charter this bank.`
                );
            }
            if (existing.ownerType !== ownerType) {
                throw new Error(
                    `[bank] charter conflict: persisted ownerType "${existing.ownerType}" ` +
                    `does not match env OWNER_TYPE "${ownerType}".`
                );
            }
            return existing;
        }

        const charter: BankCharter = {
            ownerNodeId,
            ownerType,
            charteredAt: new Date().toISOString(),
        };
        writeFileSync(this.path, JSON.stringify(charter, null, 2), "utf-8");
        console.log(`[bank] chartered to ${ownerType} node ${ownerNodeId}`);
        return charter;
    }
}
