import { CommunityDb } from "../CommunityDb.js";
import { AppSuspension } from "./AppSuspension.js";

export class AppSuspensionLoader {
    private get db() { return CommunityDb.getInstance().db; }

    save(s: AppSuspension): void {
        this.db.prepare(`
            INSERT INTO app_suspensions (id, person_id, app, reason, suspended_at, suspended_by)
            VALUES (@id, @person_id, @app, @reason, @suspended_at, @suspended_by)
            ON CONFLICT(id) DO UPDATE SET
                person_id    = excluded.person_id,
                app          = excluded.app,
                reason       = excluded.reason,
                suspended_at = excluded.suspended_at,
                suspended_by = excluded.suspended_by
        `).run({
            id:           s.id,
            person_id:    s.personId,
            app:          s.app,
            reason:       s.reason,
            suspended_at: s.suspendedAt,
            suspended_by: s.suspendedBy,
        });
    }

    delete(id: string): void {
        this.db.prepare("DELETE FROM app_suspensions WHERE id = ?").run(id);
    }

    loadAll(): AppSuspension[] {
        return (this.db.prepare("SELECT * FROM app_suspensions").all() as Array<{
            id: string; person_id: string; app: string;
            reason: string; suspended_at: string; suspended_by: string;
        }>).map(r => ({
            id:          r.id,
            personId:    r.person_id,
            app:         r.app,
            reason:      r.reason,
            suspendedAt: r.suspended_at,
            suspendedBy: r.suspended_by,
        }));
    }
}

