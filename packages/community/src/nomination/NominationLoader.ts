import { FileStore } from "@ecf/core";
import { Nomination, NominationStatus } from "./Nomination.js";

interface NominationRecord {
    id:         string;
    createdAt:  string;
    createdBy:  string;
    roleId:     string;
    unitId:     string;
    domainId:   string;
    nomineeId:  string;
    statement:  string;
    status:     NominationStatus;
    resolvedAt: string | null;
    resolvedBy: string | null;
}

export class NominationLoader {
    private readonly store: FileStore;

    constructor(dataDir: string) {
        this.store = new FileStore(dataDir);
    }

    save(n: Nomination): void {
        const record: NominationRecord = {
            id:         n.id,
            createdAt:  n.createdAt.toISOString(),
            createdBy:  n.createdBy,
            roleId:     n.roleId,
            unitId:     n.unitId,
            domainId:   n.domainId,
            nomineeId:  n.nomineeId,
            statement:  n.statement,
            status:     n.status,
            resolvedAt: n.resolvedAt?.toISOString() ?? null,
            resolvedBy: n.resolvedBy,
        };
        this.store.write(n.id, record);
    }

    loadAll(): Nomination[] {
        return this.store.readAll<NominationRecord>().map(r => this.fromRecord(r));
    }

    private fromRecord(r: NominationRecord): Nomination {
        const n = new Nomination(r.createdBy, r.roleId, r.unitId, r.domainId, r.nomineeId, r.statement, r.id);
        (n as unknown as Record<string, unknown>)["createdAt"]  = new Date(r.createdAt);
        (n as unknown as Record<string, unknown>)["status"]     = r.status;
        (n as unknown as Record<string, unknown>)["resolvedAt"] = r.resolvedAt ? new Date(r.resolvedAt) : null;
        (n as unknown as Record<string, unknown>)["resolvedBy"] = r.resolvedBy;
        return n;
    }
}
