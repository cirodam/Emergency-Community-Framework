import { CommunityDb } from "../CommunityDb.js";
import { Organization } from "./Organization.js";

export class OrgLoader {
    private get db() { return CommunityDb.getInstance().db; }

    save(org: Organization): void {
        const { privateKeyDer, publicKeyHex } = org.getKeypairForPersistence();
        const data = JSON.stringify({
            id: org.id, handle: org.handle, name: org.name, description: org.description,
            foundedBy: org.foundedBy, memberIds: org.memberIds,
            createdAt: org.createdAt, dissolvedAt: org.dissolvedAt,
            privateKeyDer, publicKeyHex,
        });
        this.db.prepare(
            "INSERT INTO organizations (id, data) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data"
        ).run(org.id, data);
    }

    loadAll(): Organization[] {
        return (this.db.prepare("SELECT data FROM organizations").all() as { data: string }[])
            .map(({ data }) => Organization.restore(JSON.parse(data)));
    }

    delete(id: string): boolean {
        return this.db.prepare("DELETE FROM organizations WHERE id = ?").run(id).changes > 0;
    }
}

