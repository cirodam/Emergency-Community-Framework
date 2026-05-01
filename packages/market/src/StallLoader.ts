import { MarketDb } from "./MarketDb.js";
import { Stall } from "./Stall.js";

export class StallLoader {
    private get db() { return MarketDb.getInstance().db; }

    save(s: Stall): void {
        this.db.prepare(`
            INSERT INTO stalls (id, data) VALUES (?, ?)
            ON CONFLICT(id) DO UPDATE SET data = excluded.data
        `).run(s.id, JSON.stringify(s));
    }

    delete(id: string): void {
        this.db.prepare(`DELETE FROM stalls WHERE id = ?`).run(id);
    }

    load(id: string): Stall | null {
        const row = this.db.prepare(`SELECT data FROM stalls WHERE id = ?`).get(id) as { data: string } | undefined;
        return row ? JSON.parse(row.data) as Stall : null;
    }

    loadAll(): Stall[] {
        const rows = this.db.prepare(`SELECT data FROM stalls`).all() as { data: string }[];
        return rows.map(r => JSON.parse(r.data) as Stall);
    }
}
