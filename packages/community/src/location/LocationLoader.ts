import { FileStore } from "@ecf/core";
import { Location } from "./Location.js";

interface LocationRecord {
    id:          string;
    name:        string;
    address:     string;
    lat:         number | null;
    lng:         number | null;
    description: string;
    createdAt:   string;
}

export class LocationLoader {
    private readonly store: FileStore;

    constructor(dataDir: string) {
        this.store = new FileStore(dataDir);
    }

    save(loc: Location): void {
        const record: LocationRecord = {
            id:          loc.id,
            name:        loc.name,
            address:     loc.address,
            lat:         loc.lat,
            lng:         loc.lng,
            description: loc.description,
            createdAt:   loc.createdAt.toISOString(),
        };
        this.store.write(loc.id, record);
    }

    loadAll(): Location[] {
        return this.store.readAll<LocationRecord>().map(r => new Location(
            r.name,
            r.address,
            r.lat  ?? null,
            r.lng  ?? null,
            r.description ?? "",
            r.id,
            new Date(r.createdAt),
        ));
    }

    delete(id: string): boolean {
        return this.store.delete(id);
    }
}
