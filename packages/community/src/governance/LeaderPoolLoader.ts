import { FileStore } from "@ecf/core";
import { LeaderPool } from "./LeaderPool.js";

interface PoolRecord {
    id: string;
    name: string;
    description: string;
    personIds: string[];
    createdAt: string;
}

export class LeaderPoolLoader {
    private readonly store: FileStore;

    constructor(dataDir: string) {
        this.store = new FileStore(dataDir);
    }

    save(pool: LeaderPool): void {
        const record: PoolRecord = {
            id:          pool.id,
            name:        pool.name,
            description: pool.description,
            personIds:   pool.personIds,
            createdAt:   pool.createdAt.toISOString(),
        };
        this.store.write(pool.id, record);
    }

    loadAll(): LeaderPool[] {
        return this.store.readAll<PoolRecord>().map(r => this.fromRecord(r));
    }

    delete(id: string): boolean {
        return this.store.delete(id);
    }

    private fromRecord(r: PoolRecord): LeaderPool {
        const pool = new LeaderPool(r.name, r.description, r.id);
        (pool as unknown as Record<string, unknown>)["createdAt"] = new Date(r.createdAt);
        pool.personIds = r.personIds ?? [];
        return pool;
    }
}
