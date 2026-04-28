import { FileStore } from "@ecf/core";
import type { GlobeApplication } from "./GlobeApplication.js";

export class GlobeApplicationLoader {
    private readonly store: FileStore;

    constructor(dataDir: string) {
        this.store = new FileStore(dataDir);
    }

    save(application: GlobeApplication): void {
        this.store.write(application.id, application);
    }

    load(id: string): GlobeApplication | null {
        return this.store.read<GlobeApplication>(id) ?? null;
    }

    loadAll(): GlobeApplication[] {
        return this.store.readAll<GlobeApplication>();
    }
}
