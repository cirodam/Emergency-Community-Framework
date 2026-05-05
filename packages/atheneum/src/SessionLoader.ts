import { AtheneumDb } from "./AtheneumDb.js";
import type { LyceumSession } from "./Session.js";

export class SessionLoader {
    private get db() { return AtheneumDb.getInstance().db; }

    save(s: LyceumSession): void {
        this.db.prepare(`
            INSERT INTO sessions (id, data) VALUES (?, ?)
            ON CONFLICT(id) DO UPDATE SET data = excluded.data
        `).run(s.id, JSON.stringify(s));
    }

    delete(id: string): void {
        this.db.prepare(`DELETE FROM sessions WHERE id = ?`).run(id);
    }

    load(id: string): LyceumSession | null {
        const row = this.db.prepare(`SELECT data FROM sessions WHERE id = ?`).get(id) as { data: string } | undefined;
        return row ? JSON.parse(row.data) as LyceumSession : null;
    }

    loadAll(): LyceumSession[] {
        const rows = this.db.prepare(`SELECT data FROM sessions`).all() as { data: string }[];
        return rows.map(r => JSON.parse(r.data) as LyceumSession);
    }
}
