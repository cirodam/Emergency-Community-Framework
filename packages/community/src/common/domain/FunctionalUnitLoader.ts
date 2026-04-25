import { FileStore } from "@ecf/core";
import { FunctionalUnit } from "./FunctionalUnit.js";

interface UnitRecord {
    id: string;
    type: string;
    name: string;
    description: string;
    personIds: string[];
    roleIds: string[];
    createdAt: string;
}

/**
 * Persistence layer for FunctionalUnit records.
 * Units are stored flat — roles and persons are referenced by ID only.
 */
export class FunctionalUnitLoader {
    private readonly store: FileStore;

    constructor(dataDir: string) {
        this.store = new FileStore(dataDir);
    }

    save(unit: FunctionalUnit): void {
        const record: UnitRecord = {
            id:          unit.id,
            type:        unit.getType(),
            name:        unit.name,
            description: unit.description,
            personIds:   unit.personIds,
            roleIds:     unit.roleIds,
            createdAt:   unit.createdAt.toISOString(),
        };
        this.store.write(unit.id, record);
    }

    loadAll(): FunctionalUnit[] {
        return this.store.readAll<UnitRecord>().map(r => this.fromRecord(r));
    }

    delete(id: string): boolean {
        return this.store.delete(id);
    }

    private fromRecord(r: UnitRecord): FunctionalUnit {
        const unit = new FunctionalUnit(r.name, r.description, r.type, r.id);
        (unit as unknown as Record<string, unknown>)["createdAt"] = new Date(r.createdAt);
        unit.personIds = r.personIds ?? [];
        unit.roleIds   = r.roleIds   ?? [];
        return unit;
    }
}
