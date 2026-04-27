import { ServiceProfile, ServiceCategory, ServiceRateUnit, ServiceAvailability, createServiceProfile } from "./ServiceProfile.js";
import { ServiceProfileLoader } from "./ServiceProfileLoader.js";

export interface ServiceProfilePatch {
    name?:         string;
    category?:     ServiceCategory;
    description?:  string;
    rate?:         number | null;
    rateUnit?:     ServiceRateUnit;
    availability?: ServiceAvailability;
}

export class ServiceProfileService {
    private static instance: ServiceProfileService;
    private profiles: Map<string, ServiceProfile> = new Map();
    private loader!: ServiceProfileLoader;

    private constructor() {}

    static getInstance(): ServiceProfileService {
        if (!ServiceProfileService.instance) ServiceProfileService.instance = new ServiceProfileService();
        return ServiceProfileService.instance;
    }

    init(loader: ServiceProfileLoader): void {
        this.loader = loader;
        for (const p of loader.loadAll()) {
            this.profiles.set(p.id, p);
        }
    }

    get(id: string): ServiceProfile | undefined {
        return this.profiles.get(id);
    }

    getAll(): ServiceProfile[] {
        return Array.from(this.profiles.values())
            .sort((a, b) => a.name.localeCompare(b.name));
    }

    getByCategory(category: ServiceCategory): ServiceProfile[] {
        return this.getAll().filter(p => p.category === category);
    }

    getByProvider(providerId: string): ServiceProfile[] {
        return this.getAll().filter(p => p.providerId === providerId);
    }

    add(
        providerId: string,
        providerHandle: string,
        name: string,
        category: ServiceCategory,
        description: string,
        rate: number | null,
        rateUnit: ServiceRateUnit,
        availability: ServiceAvailability,
    ): ServiceProfile {
        const p = createServiceProfile(providerId, providerHandle, name, category, description, rate, rateUnit, availability);
        this.profiles.set(p.id, p);
        this.loader.save(p);
        return p;
    }

    update(id: string, callerId: string, patch: ServiceProfilePatch): ServiceProfile {
        const p = this.profiles.get(id);
        if (!p) throw new Error(`Service profile ${id} not found`);
        if (p.providerId !== callerId) throw new Error("Not your service profile");
        if (patch.name         !== undefined) p.name         = patch.name;
        if (patch.category     !== undefined) p.category     = patch.category;
        if (patch.description  !== undefined) p.description  = patch.description;
        if (patch.rate         !== undefined) p.rate         = patch.rate;
        if (patch.rateUnit     !== undefined) p.rateUnit     = patch.rateUnit;
        if (patch.availability !== undefined) p.availability = patch.availability;
        p.updatedAt = new Date().toISOString();
        this.loader.save(p);
        return p;
    }

    delete(id: string, callerId: string): boolean {
        const p = this.profiles.get(id);
        if (!p) return false;
        if (p.providerId !== callerId) throw new Error("Not your service profile");
        this.profiles.delete(id);
        this.loader.delete(id);
        return true;
    }
}
