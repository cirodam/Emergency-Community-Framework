import { Marketplace, createMarketplace } from "./Marketplace.js";
import { MarketplaceLoader } from "./MarketplaceLoader.js";

export interface MarketplacePatch {
    name?:         string;
    locationId?:   string;
    locationName?: string;
    description?:  string;
}

export class MarketplaceService {
    private static instance: MarketplaceService;
    private marketplaces: Map<string, Marketplace> = new Map();
    private loader!: MarketplaceLoader;

    private constructor() {}

    static getInstance(): MarketplaceService {
        if (!MarketplaceService.instance) MarketplaceService.instance = new MarketplaceService();
        return MarketplaceService.instance;
    }

    init(loader: MarketplaceLoader): void {
        this.loader = loader;
        for (const m of loader.loadAll()) {
            this.marketplaces.set(m.id, m);
        }
    }

    // ── Queries ───────────────────────────────────────────────────────────────

    get(id: string): Marketplace | undefined {
        return this.marketplaces.get(id);
    }

    getAll(): Marketplace[] {
        return Array.from(this.marketplaces.values())
            .sort((a, b) => a.name.localeCompare(b.name));
    }

    getByLocation(locationId: string): Marketplace[] {
        return this.getAll().filter(m => m.locationId === locationId);
    }

    // ── Mutations ─────────────────────────────────────────────────────────────

    add(name: string, locationId: string, locationName: string, description: string): Marketplace {
        const m = createMarketplace(name, locationId, locationName, description);
        this.marketplaces.set(m.id, m);
        this.loader.save(m);
        return m;
    }

    update(id: string, patch: MarketplacePatch): Marketplace {
        const m = this.marketplaces.get(id);
        if (!m) throw new Error(`Marketplace ${id} not found`);
        if (patch.name         !== undefined) m.name         = patch.name;
        if (patch.locationId   !== undefined) m.locationId   = patch.locationId;
        if (patch.locationName !== undefined) m.locationName = patch.locationName;
        if (patch.description  !== undefined) m.description  = patch.description;
        this.loader.save(m);
        return m;
    }

    delete(id: string): boolean {
        if (!this.marketplaces.has(id)) return false;
        this.marketplaces.delete(id);
        this.loader.delete(id);
        return true;
    }
}
