import { BaseLoader } from "@ecf/core";
import { Shift } from "./Shift.js";

interface ShiftRecord {
    id:               string;
    createdAt:        string;
    createdBy:        string;
    domainId:         string;
    label:            string;
    startAt:          string;
    endAt:            string;
    assignedPersonId: string | null;
    note:             string | null;
}

export class ShiftLoader extends BaseLoader<ShiftRecord, Shift> {
    protected serialize(shift: Shift): ShiftRecord {
        return {
            id:               shift.id,
            createdAt:        shift.createdAt,
            createdBy:        shift.createdBy,
            domainId:         shift.domainId,
            label:            shift.label,
            startAt:          shift.startAt,
            endAt:            shift.endAt,
            assignedPersonId: shift.assignedPersonId,
            note:             shift.note,
        };
    }

    protected deserialize(r: ShiftRecord): Shift { return Shift.restore(r); }
}
