import { BaseLoader } from "@ecf/core";
import { LeaderPool } from "./LeaderPool.js";

interface PoolRecord {
    id:          string;
    name:        string;
    description: string;
    personIds:   string[];
    createdAt:   string;
}

export class LeaderPoolLoader extends BaseLoader<PoolRecord, LeaderPool> {
    protected serialize(pool: LeaderPool): PoolRecord {
        return {
            id:          pool.id,
            name:        pool.name,
            description: pool.description,
            personIds:   pool.personIds,
            createdAt:   pool.createdAt.toISOString(),
        };
    }

    protected deserialize(r: PoolRecord): LeaderPool {
        const pool = new LeaderPool(r.name, r.description, r.id);
        (pool as unknown as Record<string, unknown>)["createdAt"] = new Date(r.createdAt);
        pool.personIds = r.personIds ?? [];
        return pool;
    }
}
