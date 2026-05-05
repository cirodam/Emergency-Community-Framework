import { AtheneumDb } from "./AtheneumDb.js";
import type { Course } from "./Course.js";

export class CourseLoader {
    private get db() { return AtheneumDb.getInstance().db; }

    save(c: Course): void {
        this.db.prepare(`
            INSERT INTO courses (id, data) VALUES (?, ?)
            ON CONFLICT(id) DO UPDATE SET data = excluded.data
        `).run(c.id, JSON.stringify(c));
    }

    delete(id: string): void {
        this.db.prepare(`DELETE FROM courses WHERE id = ?`).run(id);
    }

    load(id: string): Course | null {
        const row = this.db.prepare(`SELECT data FROM courses WHERE id = ?`).get(id) as { data: string } | undefined;
        return row ? JSON.parse(row.data) as Course : null;
    }

    loadAll(): Course[] {
        const rows = this.db.prepare(`SELECT data FROM courses`).all() as { data: string }[];
        return rows.map(r => JSON.parse(r.data) as Course);
    }
}
