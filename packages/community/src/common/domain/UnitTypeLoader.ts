import { CommunityDb } from "../../CommunityDb.js";
import { UnitType, type UnitTypeData } from "./UnitType.js";

export class UnitTypeLoader {
    private get db() { return CommunityDb.getInstance().db; }

    save(u: UnitType): void {
        const data = JSON.stringify(u.toData());
        this.db.prepare(
            "INSERT INTO unit_types (id, data) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data"
        ).run(u.id, data);
    }

    loadAll(): UnitType[] {
        return (this.db.prepare("SELECT data FROM unit_types").all() as { data: string }[])
            .map(({ data }) => UnitType.restore(JSON.parse(data) as UnitTypeData));
    }

    deleteById(id: string): boolean {
        return this.db.prepare("DELETE FROM unit_types WHERE id = ?").run(id).changes > 0;
    }
}
