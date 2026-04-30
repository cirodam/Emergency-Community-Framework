import { BaseLoader } from "@ecf/core";
import { Nomination, NominationStatus } from "./Nomination.js";

interface NominationRecord {
    id:         string;
    createdAt:  string;
    createdBy:  string;
    type:       "role" | "pool";
    roleId:     string;
    unitId:     string;
    domainId:   string;
    poolId:     string | null;
    nomineeId:  string;
    statement:  string;
    status:     NominationStatus;
    resolvedAt: string | null;
    resolvedBy: string | null;
}

export class NominationLoader extends BaseLoader<NominationRecord, Nomination> {
    protected serialize(n: Nomination): NominationRecord {
        return {
            id:         n.id,
            createdAt:  n.createdAt.toISOString(),
            createdBy:  n.createdBy,
            type:       n.type,
            roleId:     n.roleId,
            unitId:     n.unitId,
            domainId:   n.domainId,
            poolId:     n.poolId,
            nomineeId:  n.nomineeId,
            statement:  n.statement,
            status:     n.status,
            resolvedAt: n.resolvedAt?.toISOString() ?? null,
            resolvedBy: n.resolvedBy,
        };
    }

    protected deserialize(r: NominationRecord): Nomination {
        const raw = r as Partial<NominationRecord>;
        const type = raw.type ?? "role";
        let n: Nomination;
        if (type === "pool") {
            n = Nomination.forPool(r.createdBy, r.poolId ?? "", r.nomineeId, r.statement, r.id);
        } else {
            n = new Nomination(r.createdBy, r.roleId, r.unitId, r.domainId, r.nomineeId, r.statement, r.id);
        }
        (n as unknown as Record<string, unknown>)["createdAt"]  = new Date(r.createdAt);
        (n as unknown as Record<string, unknown>)["status"]     = r.status;
        (n as unknown as Record<string, unknown>)["resolvedAt"] = r.resolvedAt ? new Date(r.resolvedAt) : null;
        (n as unknown as Record<string, unknown>)["resolvedBy"] = r.resolvedBy;
        return n;
    }
}
