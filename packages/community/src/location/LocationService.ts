import { Location } from "./Location.js";
import { LocationLoader } from "./LocationLoader.js";

export class LocationService {
    private static instance: LocationService;
    private locations: Map<string, Location> = new Map();
    private loader: LocationLoader | null = null;

    private constructor() {}

    static getInstance(): LocationService {
        if (!LocationService.instance) LocationService.instance = new LocationService();
        return LocationService.instance;
    }

    init(loader: LocationLoader): void {
        this.loader = loader;
        for (const loc of loader.loadAll()) {
            this.locations.set(loc.id, loc);
        }
    }

    getAll(): Location[] { return Array.from(this.locations.values()); }

    get(id: string): Location | undefined { return this.locations.get(id); }

    create(loc: Location): void {
        this.locations.set(loc.id, loc);
        this.loader?.save(loc);
    }

    update(id: string, patch: { name?: string; address?: string; lat?: number | null; lng?: number | null; description?: string }): Location | null {
        const loc = this.locations.get(id);
        if (!loc) return null;
        if (patch.name        !== undefined) loc.name        = patch.name;
        if (patch.address     !== undefined) loc.address     = patch.address;
        if (patch.lat         !== undefined) loc.lat         = patch.lat;
        if (patch.lng         !== undefined) loc.lng         = patch.lng;
        if (patch.description !== undefined) loc.description = patch.description;
        this.loader?.save(loc);
        return loc;
    }

    delete(id: string): boolean {
        if (!this.locations.has(id)) return false;
        this.locations.delete(id);
        this.loader?.delete(id);
        return true;
    }
}
