import { BaseLoader } from "@ecf/core";
import { FunctionalUnit } from "./FunctionalUnit.js";

interface UnitRecord {
    id: string;
    type: string;
    name: string;
    description: string;
    personIds: string[];
    roleIds: string[];
    locationId: string | null;
    createdAt: string;
}

/**
 * Persistence layer for FunctionalUnit records.
 * Units are stored flat — roles and persons are referenced by ID only.
 */
export class FunctionalUnitLoader extends BaseLoader<UnitRecord, FunctionalUnit> {
    protected serialize(unit: FunctionalUnit): UnitRecord {
        return {
            id:          unit.id,
            type:        unit.getType(),
            name:        unit.name,
            description: unit.description,
            personIds:   unit.personIds,
            roleIds:     unit.roleIds,
            locationId:  unit.locationId,
            createdAt:   unit.createdAt.toISOString(),
        };
    }

    protected deserialize(r: UnitRecord): FunctionalUnit {
        const unit = new FunctionalUnit(r.name, r.description, r.type, r.id);
        (unit as unknown as Record<string, unknown>)["createdAt"] = new Date(r.createdAt);
        unit.personIds  = r.personIds  ?? [];
        unit.roleIds    = r.roleIds    ?? [];
        unit.locationId = r.locationId ?? null;
        return unit;
    }
}
