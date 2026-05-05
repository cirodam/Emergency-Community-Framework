import { AtheneumDb } from "./AtheneumDb.js";
import type { ClassRequest } from "./ClassRequest.js";

export class ClassRequestLoader {
    private get db() { return AtheneumDb.getInstance().db; }

    save(r: ClassRequest): void {
        this.db.prepare(`
            INSERT INTO class_requests (id, data) VALUES (?, ?)
            ON CONFLICT(id) DO UPDATE SET data = excluded.data
        `).run(r.id, JSON.stringify(r));
    }

    load(id: string): ClassRequest | null {
        const row = this.db.prepare(`SELECT data FROM class_requests WHERE id = ?`).get(id) as { data: string } | undefined;
        return row ? JSON.parse(row.data) as ClassRequest : null;
    }

    loadAll(): ClassRequest[] {
        const rows = this.db.prepare(`SELECT data FROM class_requests`).all() as { data: string }[];
        return rows.map(r => JSON.parse(r.data) as ClassRequest);
    }
}
