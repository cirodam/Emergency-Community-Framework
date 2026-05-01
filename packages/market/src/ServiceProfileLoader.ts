import { MarketDb } from "./MarketDb.js";
import { ServiceProfile } from "./ServiceProfile.js";

export class ServiceProfileLoader {
    private get db() { return MarketDb.getInstance().db; }

    save(p: ServiceProfile): void {
        this.db.prepare(`
            INSERT INTO service_profiles (id, data) VALUES (?, ?)
            ON CONFLICT(id) DO UPDATE SET data = excluded.data
        `).run(p.id, JSON.stringify(p));
    }

    delete(id: string): void {
        this.db.prepare(`DELETE FROM service_profiles WHERE id = ?`).run(id);
    }

    load(id: string): ServiceProfile | null {
        const row = this.db.prepare(`SELECT data FROM service_profiles WHERE id = ?`).get(id) as { data: string } | undefined;
        return row ? JSON.parse(row.data) as ServiceProfile : null;
    }

    loadAll(): ServiceProfile[] {
        const rows = this.db.prepare(`SELECT data FROM service_profiles`).all() as { data: string }[];
        return rows.map(r => JSON.parse(r.data) as ServiceProfile);
    }
}
