import { MarketDb } from "./MarketDb.js";
import { Classified } from "./Classified.js";

export class ClassifiedLoader {
    private get db() { return MarketDb.getInstance().db; }

    save(c: Classified): void {
        this.db.prepare(`
            INSERT INTO classifieds (id, data) VALUES (?, ?)
            ON CONFLICT(id) DO UPDATE SET data = excluded.data
        `).run(c.id, JSON.stringify(c));
    }

    delete(id: string): void {
        this.db.prepare(`DELETE FROM classifieds WHERE id = ?`).run(id);
    }

    load(id: string): Classified | null {
        const row = this.db.prepare(`SELECT data FROM classifieds WHERE id = ?`).get(id) as { data: string } | undefined;
        return row ? JSON.parse(row.data) as Classified : null;
    }

    loadAll(): Classified[] {
        const rows = this.db.prepare(`SELECT data FROM classifieds`).all() as { data: string }[];
        return rows.map(r => JSON.parse(r.data) as Classified);
    }
}
