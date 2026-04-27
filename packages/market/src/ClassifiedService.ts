import { Classified, ClassifiedCategory, ClassifiedStatus, createClassified } from "./Classified.js";
import { ClassifiedLoader } from "./ClassifiedLoader.js";

export interface ClassifiedPatch {
    title?:       string;
    description?: string;
    price?:       number;
}

export class ClassifiedService {
    private static instance: ClassifiedService;
    private classifieds: Map<string, Classified> = new Map();
    private loader!: ClassifiedLoader;

    private constructor() {}

    static getInstance(): ClassifiedService {
        if (!ClassifiedService.instance) ClassifiedService.instance = new ClassifiedService();
        return ClassifiedService.instance;
    }

    init(loader: ClassifiedLoader): void {
        this.loader = loader;
        for (const c of loader.loadAll()) {
            this.classifieds.set(c.id, c);
        }
    }

    // ── Queries ───────────────────────────────────────────────────────────────

    get(id: string): Classified | undefined {
        return this.classifieds.get(id);
    }

    getAll(): Classified[] {
        return Array.from(this.classifieds.values())
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }

    getOpen(category?: ClassifiedCategory): Classified[] {
        return this.getAll().filter(c =>
            c.status === "open" && (!category || c.category === category),
        );
    }

    getByPoster(posterId: string): Classified[] {
        return this.getAll().filter(c => c.posterId === posterId);
    }

    // ── Mutations ─────────────────────────────────────────────────────────────

    add(
        posterId: string,
        posterHandle: string,
        category: ClassifiedCategory,
        title: string,
        description: string,
        price: number,
    ): Classified {
        const c = createClassified(posterId, posterHandle, category, title, description, price);
        this.classifieds.set(c.id, c);
        this.loader.save(c);
        return c;
    }

    update(id: string, callerId: string, patch: ClassifiedPatch): Classified {
        const c = this.classifieds.get(id);
        if (!c)                throw new Error(`Classified ${id} not found`);
        if (c.posterId !== callerId) throw new Error("Not your classified");
        if (c.status !== "open")    throw new Error("Classified is no longer open");
        if (patch.title       !== undefined) c.title       = patch.title;
        if (patch.description !== undefined) c.description = patch.description;
        if (patch.price       !== undefined) c.price       = patch.price;
        c.updatedAt = new Date().toISOString();
        this.loader.save(c);
        return c;
    }

    cancel(id: string, callerId: string): Classified {
        const c = this.classifieds.get(id);
        if (!c)                throw new Error(`Classified ${id} not found`);
        if (c.posterId !== callerId) throw new Error("Not your classified");
        if (c.status !== "open")    throw new Error("Classified is no longer open");
        c.status    = "cancelled";
        c.updatedAt = new Date().toISOString();
        this.loader.save(c);
        return c;
    }

    markClosed(id: string, counterpartyId: string): Classified {
        const c = this.classifieds.get(id);
        if (!c)               throw new Error(`Classified ${id} not found`);
        if (c.status !== "open") throw new Error("Classified is not open");
        c.status          = "closed";
        c.counterpartyId  = counterpartyId;
        c.updatedAt       = new Date().toISOString();
        this.loader.save(c);
        return c;
    }
}
