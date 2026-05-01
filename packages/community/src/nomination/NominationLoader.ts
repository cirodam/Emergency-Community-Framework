import { CommunityDb } from "../CommunityDb.js";
import { Nomination, NominationStatus } from "./Nomination.js";

interface NominationRow {
    id: string; created_at: string; created_by: string;
    type: string; role_id: string; unit_id: string; domain_id: string;
    pool_id: string | null; nominee_id: string; statement: string;
    status: string; resolved_at: string | null; resolved_by: string | null;
}

export class NominationLoader {
    private get db() { return CommunityDb.getInstance().db; }

    save(n: Nomination): void {
        this.db.prepare(`
            INSERT INTO nominations
                (id, created_at, created_by, type, role_id, unit_id, domain_id,
                 pool_id, nominee_id, statement, status, resolved_at, resolved_by)
            VALUES
                (@id, @created_at, @created_by, @type, @role_id, @unit_id, @domain_id,
                 @pool_id, @nominee_id, @statement, @status, @resolved_at, @resolved_by)
            ON CONFLICT(id) DO UPDATE SET
                status = excluded.status,
                resolved_at = excluded.resolved_at,
                resolved_by = excluded.resolved_by
        `).run({
            id: n.id,
            created_at: n.createdAt.toISOString(),
            created_by: n.createdBy,
            type: n.type,
            role_id: n.roleId ?? "",
            unit_id: n.unitId ?? "",
            domain_id: n.domainId ?? "",
            pool_id: n.poolId ?? null,
            nominee_id: n.nomineeId,
            statement: n.statement,
            status: n.status,
            resolved_at: n.resolvedAt?.toISOString() ?? null,
            resolved_by: n.resolvedBy ?? null,
        });
    }

    loadAll(): Nomination[] {
        return (this.db.prepare("SELECT * FROM nominations").all() as NominationRow[])
            .map(r => {
                const type = (r.type ?? "role") as "role" | "pool";
                let nom: Nomination;
                if (type === "pool") {
                    nom = Nomination.forPool(r.created_by, r.pool_id ?? "", r.nominee_id, r.statement, r.id);
                } else {
                    nom = new Nomination(r.created_by, r.role_id, r.unit_id, r.domain_id, r.nominee_id, r.statement, r.id);
                }
                const rw = nom as unknown as Record<string, unknown>;
                rw["createdAt"]  = new Date(r.created_at);
                rw["status"]     = r.status as NominationStatus;
                rw["resolvedAt"] = r.resolved_at ? new Date(r.resolved_at) : null;
                rw["resolvedBy"] = r.resolved_by ?? null;
                return nom;
            });
    }

    delete(id: string): boolean {
        return this.db.prepare("DELETE FROM nominations WHERE id = ?").run(id).changes > 0;
    }
}

