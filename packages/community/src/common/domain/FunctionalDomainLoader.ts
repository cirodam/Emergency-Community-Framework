import { FileStore } from "@ecf/core";
import { FunctionalDomain } from "./FunctionalDomain.js";

interface DomainStateRecord {
    id: string;
    unitIds: string[];
    roleIds: string[];
    poolId: string | null;
}

/**
 * Persists the mutable relationship state for each FunctionalDomain.
 * Domain identity (name, description, type) comes from code; only the
 * IDs of associated units, roles, and the governing pool are persisted here.
 */
export class FunctionalDomainLoader {
    private readonly store: FileStore;

    constructor(dataDir: string) {
        this.store = new FileStore(dataDir);
    }

    save(domain: FunctionalDomain): void {
        const record: DomainStateRecord = {
            id:      domain.id,
            unitIds: domain.unitIds,
            roleIds: domain.roleIds,
            poolId:  domain.poolId,
        };
        this.store.write(domain.id, record);
    }

    /**
     * Restore persisted state onto an already-constructed domain instance.
     * Called during startup after all domain singletons have been created.
     */
    restore(domain: FunctionalDomain): void {
        const record = this.store.read<DomainStateRecord>(domain.id);
        if (!record) return;
        domain.unitIds = record.unitIds ?? [];
        domain.roleIds = record.roleIds ?? [];
        domain.poolId  = record.poolId  ?? null;
    }

    delete(domainId: string): boolean {
        return this.store.delete(domainId);
    }
}
