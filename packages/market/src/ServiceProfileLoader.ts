import { FileStore } from "@ecf/core";
import { ServiceProfile } from "./ServiceProfile.js";

export class ServiceProfileLoader {
    private readonly store: FileStore;

    constructor(dataDir: string) {
        this.store = new FileStore(dataDir);
    }

    save(profile: ServiceProfile): void {
        this.store.write(profile.id, profile);
    }

    loadAll(): ServiceProfile[] {
        return this.store.readAll<ServiceProfile>();
    }

    delete(id: string): void {
        this.store.delete(id);
    }
}
