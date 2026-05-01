import { CommunityDb } from "../CommunityDb.js";
import { MemberApplication, ApplicationData } from "./MemberApplication.js";

export class MemberApplicationLoader {
    private get db() { return CommunityDb.getInstance().db; }

    save(app: MemberApplication): void {
        const data = JSON.stringify(app.toData());
        this.db.prepare(
            "INSERT INTO member_applications (id, data) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data"
        ).run(app.id, data);
    }

    loadAll(): MemberApplication[] {
        return (this.db.prepare("SELECT data FROM member_applications").all() as { data: string }[])
            .map(({ data }) => MemberApplication.restore(JSON.parse(data) as ApplicationData));
    }

    delete(id: string): boolean {
        return this.db.prepare("DELETE FROM member_applications WHERE id = ?").run(id).changes > 0;
    }
}

