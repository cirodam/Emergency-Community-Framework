import { FileStore } from "@ecf/core";
import { Listing } from "./Listing.js";

export class ListingLoader {
    private readonly store: FileStore;

    constructor(dataDir: string) {
        this.store = new FileStore(dataDir);
    }

    save(listing: Listing): void {
        this.store.write(listing.id, listing);
    }

    load(id: string): Listing | undefined {
        return this.store.read<Listing>(id);
    }

    loadAll(): Listing[] {
        return this.store.readAll<Listing>();
    }

    delete(id: string): void {
        this.store.delete(id);
    }
}
