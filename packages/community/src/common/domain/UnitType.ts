import { randomUUID } from "crypto";

export interface UnitTypeData {
    id:          string;
    type:        string;
    label:       string;
    description: string;
}

/**
 * A unit type is an entry in the community's unit bank — a governance-approved
 * catalog of functional unit templates that domains can draw from when deploying
 * new operational units (e.g. "bakery", "mobile-clinic", "radio-relay-tower").
 *
 * Built-in types are registered at startup by each domain's *UnitTemplates.ts file
 * and are not persisted here. Only community-created custom types are stored in DB.
 */
export class UnitType {
    readonly id:  string;
    type:         string;
    label:        string;
    description:  string;

    constructor(type: string, label: string, description: string, id?: string) {
        this.id          = id ?? randomUUID();
        this.type        = type;
        this.label       = label;
        this.description = description;
    }

    toData(): UnitTypeData {
        return { id: this.id, type: this.type, label: this.label, description: this.description };
    }

    static restore(data: UnitTypeData): UnitType {
        return new UnitType(data.type, data.label, data.description, data.id);
    }
}
