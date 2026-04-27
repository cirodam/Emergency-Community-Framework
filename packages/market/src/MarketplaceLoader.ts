import { FileStore } from "@ecf/core";
import { Marketplace } from "./Marketplace.js";

export class MarketplaceLoader {
    private readonly store: FileStore;

    constructor(dataDir: string) {
        this.store = new FileStore(dataDir);
    }

    save(marketplace: Marketplace): void {
        this.store.write(marketplace.id, marketplace);
    }

    loadAll(): Marketplace[] {
        return this.store.readAll<Marketplace>();
    }

    delete(id: string): void {
        this.store.delete(id);
    }
}
