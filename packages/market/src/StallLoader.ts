import { FileStore } from "@ecf/core";
import { Stall } from "./Stall.js";

export class StallLoader {
    private readonly store: FileStore;

    constructor(dataDir: string) {
        this.store = new FileStore(dataDir);
    }

    save(stall: Stall): void {
        this.store.write(stall.id, stall);
    }

    loadAll(): Stall[] {
        return this.store.readAll<Stall>();
    }

    delete(id: string): void {
        this.store.delete(id);
    }
}
