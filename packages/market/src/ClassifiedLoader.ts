import { FileStore } from "@ecf/core";
import { Classified } from "./Classified.js";

export class ClassifiedLoader {
    private readonly store: FileStore;

    constructor(dataDir: string) {
        this.store = new FileStore(dataDir);
    }

    save(c: Classified): void {
        this.store.write(c.id, c);
    }

    loadAll(): Classified[] {
        return this.store.readAll<Classified>();
    }

    delete(id: string): void {
        this.store.delete(id);
    }
}
