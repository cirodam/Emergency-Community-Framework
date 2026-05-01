import { CommunityDb } from "../CommunityDb.js";
import { Constitution, ConstitutionDocument } from "./Constitution.js";

const KEY = "constitution";

export class ConstitutionLoader {
    private get db() { return CommunityDb.getInstance().db; }

    /** Load the persisted document into the Constitution singleton, or seed defaults on first boot. */
    load(): void {
        const row = this.db.prepare("SELECT data FROM singleton_records WHERE key = ?").get(KEY) as { data: string } | undefined;
        if (row) {
            Constitution.getInstance().load(JSON.parse(row.data) as ConstitutionDocument);
        } else {
            this.save();
        }
    }

    save(): void {
        const data = JSON.stringify(Constitution.getInstance().toDocument());
        this.db.prepare(
            "INSERT INTO singleton_records (key, data) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET data = excluded.data"
        ).run(KEY, data);
    }
}

