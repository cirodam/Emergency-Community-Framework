import { BaseLoader } from "@ecf/core";
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

export class LocationLoader extends BaseLoader<LocationRecord, Location> {
    protected serialize(loc: Location): LocationRecord {
        return {
            id:          loc.id,
            name:        loc.name,
            address:     loc.address,
            lat:         loc.lat,
            lng:         loc.lng,
            description: loc.description,
            createdAt:   loc.createdAt.toISOString(),
        };
    }

    protected deserialize(r: LocationRecord): Location {
        return new Location(
            r.name,
            r.address,
            r.lat  ?? null,
            r.lng  ?? null,
            r.description ?? "",
            r.id,
            new Date(r.createdAt),
        );
    }
}
