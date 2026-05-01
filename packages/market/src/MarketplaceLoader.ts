import { MarketDb } from "./MarketDb.js";
import { Marketplace } from "./Marketplace.js";

export class MarketplaceLoader {
    private get db() { return MarketDb.getInstance().db; }

    save(m: Marketplace): void {
        this.db.prepare(`
            INSERT INTO marketplaces (id, data) VALUES (?, ?)
            ON CONFLICT(id) DO UPDATE SET data = excluded.data
        `).run(m.id, JSON.stringify(m));
    }

    delete(id: string): void {
        this.db.prepare(`DELETE FROM marketplaces WHERE id = ?`).run(id);
    }

    load(id: string): Marketplace | null {
        const row = this.db.prepare(`SELECT data FROM marketplaces WHERE id = ?`).get(id) as { data: string } | undefined;
        return row ? JSON.parse(row.data) as Marketplace : null;
    }

    loadAll(): Marketplace[] {
        const rows = this.db.prepare(`SELECT data FROM marketplaces`).all() as { data: string }[];
        return rows.map(r => JSON.parse(r.data) as Marketplace);
    }
}
