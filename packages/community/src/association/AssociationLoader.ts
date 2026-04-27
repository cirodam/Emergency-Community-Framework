import { FileStore } from "@ecf/core";
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

export class AssociationLoader {
    private readonly store: FileStore;

    constructor(dataDir: string) {
        this.store = new FileStore(dataDir);
    }

    save(a: Association): void {
        const record: AssociationRecord = {
            id:           a.id,
            name:         a.name,
            handle:       a.handle,
            description:  a.description,
            active:       a.active,
            memberIds:    a.memberIds,
            adminIds:     a.adminIds,
            registeredAt: a.registeredAt.toISOString(),
        };
        this.store.write(a.id, record);
    }

    loadAll(): Association[] {
        return this.store.readAll<AssociationRecord>().map(r => this.fromRecord(r));
    }

    delete(id: string): boolean {
        return this.store.delete(id);
    }

    private fromRecord(r: AssociationRecord): Association {
        const a = new Association(r.name, r.handle, r.description, r.id);
        (a as unknown as Record<string, unknown>)["registeredAt"] = new Date(r.registeredAt);
        (a as unknown as Record<string, unknown>)["active"]       = r.active;
        a.memberIds = r.memberIds ?? [];
        a.adminIds  = r.adminIds  ?? [];
        return a;
    }
}
