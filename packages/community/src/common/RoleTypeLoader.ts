import { CommunityDb } from "../CommunityDb.js";
import { RoleType, type RoleTypeData } from "./RoleType.js";

export class RoleTypeLoader {
    private get db() { return CommunityDb.getInstance().db; }

    save(r: RoleType): void {
        const data = JSON.stringify(r.toData());
        this.db.prepare(
            "INSERT INTO role_types (id, data) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data"
        ).run(r.id, data);
    }

    loadAll(): RoleType[] {
        return (this.db.prepare("SELECT data FROM role_types").all() as { data: string }[])
            .map(({ data }) => RoleType.restore(JSON.parse(data) as RoleTypeData));
    }

    delete(id: string): boolean {
        return this.db.prepare("DELETE FROM role_types WHERE id = ?").run(id).changes > 0;
    }
}

