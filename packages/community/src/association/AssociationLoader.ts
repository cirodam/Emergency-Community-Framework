import { BaseLoader } from "@ecf/core";
import { Association } from "./Association.js";

interface AssociationRecord {
    id:           string;
    name:         string;
    handle:       string;
    description:  string;
    active:       boolean;
    memberIds:    string[];
    adminIds:     string[];
    registeredAt: string;
}

export class AssociationLoader extends BaseLoader<AssociationRecord, Association> {
    protected serialize(a: Association): AssociationRecord {
        return {
            id:           a.id,
            name:         a.name,
            handle:       a.handle,
            description:  a.description,
            active:       a.active,
            memberIds:    a.memberIds,
            adminIds:     a.adminIds,
            registeredAt: a.registeredAt.toISOString(),
        };
    }

    protected deserialize(r: AssociationRecord): Association {
        const a = new Association(r.name, r.handle, r.description, r.id);
        (a as unknown as Record<string, unknown>)["registeredAt"] = new Date(r.registeredAt);
        (a as unknown as Record<string, unknown>)["active"]       = r.active;
        a.memberIds = r.memberIds ?? [];
        a.adminIds  = r.adminIds  ?? [];
        return a;
    }
}
