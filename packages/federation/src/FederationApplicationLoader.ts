import { FileStore } from "@ecf/core";
import type { FederationApplication } from "./FederationApplication.js";

export class FederationApplicationLoader {
    private readonly store: FileStore;

    constructor(dataDir: string) {
        this.store = new FileStore(dataDir);
    }

    save(app: FederationApplication): void {
        this.store.write(app.id, app);
    }

    load(id: string): FederationApplication | null {
        return this.store.read<FederationApplication>(id) ?? null;
    }

    loadAll(): FederationApplication[] {
        return this.store.readAll<FederationApplication>();
    }
}
