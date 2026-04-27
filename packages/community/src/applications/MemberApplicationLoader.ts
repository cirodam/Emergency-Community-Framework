import { FileStore } from "@ecf/core";
import { MemberApplication, ApplicationData } from "./MemberApplication.js";

export class MemberApplicationLoader {
    private readonly store: FileStore;

    constructor(dataDir: string) {
        this.store = new FileStore(dataDir);
    }

    save(app: MemberApplication): void {
        this.store.write(app.id, app.toData());
    }

    loadAll(): MemberApplication[] {
        return this.store.readAll<ApplicationData>().map(d => MemberApplication.restore(d));
    }

    delete(id: string): boolean {
        return this.store.delete(id);
    }
}
