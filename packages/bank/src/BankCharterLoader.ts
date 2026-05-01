import { BankDb } from "./BankDb.js";

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
    private get db() { return BankDb.getInstance().db; }

    load(ownerNodeId: string, ownerType: CharterOwnerType): BankCharter {
        const existing = this.db.prepare(
            "SELECT owner_node_id, owner_type, chartered_at FROM charter WHERE id = 1"
        ).get() as { owner_node_id: string; owner_type: string; chartered_at: string } | undefined;

        if (existing) {
            if (existing.owner_node_id !== ownerNodeId) {
                throw new Error(
                    `[bank] charter conflict: persisted ownerNodeId "${existing.owner_node_id}" ` +
                    `does not match env OWNER_NODE_ID "${ownerNodeId}". ` +
                    `Delete bank.db to re-charter this bank.`
                );
            }
            if (existing.owner_type !== ownerType) {
                throw new Error(
                    `[bank] charter conflict: persisted ownerType "${existing.owner_type}" ` +
                    `does not match env OWNER_TYPE "${ownerType}".`
                );
            }
            return {
                ownerNodeId: existing.owner_node_id,
                ownerType:   existing.owner_type as CharterOwnerType,
                charteredAt: existing.chartered_at,
            };
        }

        const charteredAt = new Date().toISOString();
        this.db.prepare(
            "INSERT INTO charter (id, owner_node_id, owner_type, chartered_at) VALUES (1, ?, ?, ?)"
        ).run(ownerNodeId, ownerType, charteredAt);

        console.log(`[bank] chartered to ${ownerType} node ${ownerNodeId}`);
        return { ownerNodeId, ownerType, charteredAt };
    }
}

