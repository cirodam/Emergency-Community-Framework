import { CommunityDb } from "../CommunityDb.js";
import { Association } from "./Association.js";

interface AssociationRecord {
    id: string; name: string; handle: string; description: string;
    active: boolean; memberIds: string[]; adminIds: string[]; registeredAt: string;
}

export class AssociationLoader {
    private get db() { return CommunityDb.getInstance().db; }

    save(a: Association): void {
        const data = JSON.stringify({
            id: a.id, name: a.name, handle: a.handle, description: a.description,
            active: a.active, memberIds: a.memberIds, adminIds: a.adminIds,
            registeredAt: a.registeredAt.toISOString(),
        });
        this.db.prepare(
            "INSERT INTO associations (id, data) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data"
        ).run(a.id, data);
    }

    loadAll(): Association[] {
        return (this.db.prepare("SELECT data FROM associations").all() as { data: string }[])
            .map(({ data }) => {
                const r = JSON.parse(data) as AssociationRecord;
                const a = new Association(r.name, r.handle, r.description, r.id);
                (a as unknown as Record<string, unknown>)["registeredAt"] = new Date(r.registeredAt);
                (a as unknown as Record<string, unknown>)["active"]       = r.active;
                a.memberIds = r.memberIds ?? [];
                a.adminIds  = r.adminIds  ?? [];
                return a;
            });
    }

    delete(id: string): boolean {
        return this.db.prepare("DELETE FROM associations WHERE id = ?").run(id).changes > 0;
    }
}

