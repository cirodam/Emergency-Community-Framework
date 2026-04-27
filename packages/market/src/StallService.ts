import { Stall, StallCategory, StallStatus, createStall } from "./Stall.js";
import { StallLoader } from "./StallLoader.js";

export interface StallPatch {
    name?:            string;
    description?:     string;
    category?:        StallCategory;
    stallNumber?:     string;
    status?:          StallStatus;
    marketplaceName?: string; // updated when marketplace is renamed
}

export class StallService {
    private static instance: StallService;
    private stalls: Map<string, Stall> = new Map();
    private loader!: StallLoader;

    private constructor() {}

    static getInstance(): StallService {
        if (!StallService.instance) StallService.instance = new StallService();
        return StallService.instance;
    }

    init(loader: StallLoader): void {
        this.loader = loader;
        for (const s of loader.loadAll()) {
            this.stalls.set(s.id, s);
        }
    }

    get(id: string): Stall | undefined {
        return this.stalls.get(id);
    }

    getAll(): Stall[] {
        return Array.from(this.stalls.values())
            .sort((a, b) => a.name.localeCompare(b.name));
    }

    getByMarketplace(marketplaceId: string): Stall[] {
        return this.getAll().filter(s => s.marketplaceId === marketplaceId);
    }

    getByHolder(holderId: string): Stall[] {
        return this.getAll().filter(s => s.holderId === holderId);
    }

    add(
        marketplaceId: string,
        marketplaceName: string,
        holderId: string,
        holderHandle: string,
        name: string,
        description: string,
        category: StallCategory,
        stallNumber: string,
    ): Stall {
        const s = createStall(marketplaceId, marketplaceName, holderId, holderHandle, name, description, category, stallNumber);
        this.stalls.set(s.id, s);
        this.loader.save(s);
        return s;
    }

    update(id: string, patch: StallPatch): Stall {
        const s = this.stalls.get(id);
        if (!s) throw new Error(`Stall ${id} not found`);
        if (patch.name            !== undefined) s.name            = patch.name;
        if (patch.description     !== undefined) s.description     = patch.description;
        if (patch.category        !== undefined) s.category        = patch.category;
        if (patch.stallNumber     !== undefined) s.stallNumber     = patch.stallNumber;
        if (patch.status          !== undefined) s.status          = patch.status;
        if (patch.marketplaceName !== undefined) s.marketplaceName = patch.marketplaceName;
        this.loader.save(s);
        return s;
    }

    delete(id: string): boolean {
        if (!this.stalls.has(id)) return false;
        this.stalls.delete(id);
        this.loader.delete(id);
        return true;
    }
}
