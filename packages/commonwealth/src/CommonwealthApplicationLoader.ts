import { FileStore } from "@ecf/core";
import type { CommonwealthApplication } from "./CommonwealthApplication.js";

export class CommonwealthApplicationLoader {
    private readonly store: FileStore;

    constructor(dataDir: string) {
        this.store = new FileStore(dataDir);
    }

    save(app: CommonwealthApplication): void {
        this.store.write(app.id, app);
    }

    load(id: string): CommonwealthApplication | null {
        return this.store.read<CommonwealthApplication>(id) ?? null;
    }

    loadAll(): CommonwealthApplication[] {
        return this.store.readAll<CommonwealthApplication>();
    }
}
