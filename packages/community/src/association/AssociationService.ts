import { Association } from "./Association.js";
import { AssociationLoader } from "./AssociationLoader.js";

export class AssociationService {
    private static instance: AssociationService;

    private associations: Map<string, Association> = new Map();
    private handleIndex:  Map<string, string>       = new Map(); // handle → id
    private loader: AssociationLoader | null = null;

    private constructor() {}

    static getInstance(): AssociationService {
        if (!AssociationService.instance) AssociationService.instance = new AssociationService();
        return AssociationService.instance;
    }

    init(loader: AssociationLoader): void {
        this.loader = loader;
        for (const a of loader.loadAll()) {
            this.associations.set(a.id, a);
            this.handleIndex.set(a.handle, a.id);
        }
        console.log(`[AssociationService] loaded ${this.associations.size} association(s)`);
    }

    // ── Queries ───────────────────────────────────────────────────────────────

    getAll(): Association[] {
        return Array.from(this.associations.values()).filter(a => a.active);
    }

    getById(id: string): Association | undefined {
        return this.associations.get(id);
    }

    getByHandle(handle: string): Association | undefined {
        const id = this.handleIndex.get(handle);
        return id ? this.associations.get(id) : undefined;
    }

    isHandleTaken(handle: string): boolean {
        return this.handleIndex.has(handle);
    }

    getForPerson(personId: string): Association[] {
        return this.getAll().filter(a => a.hasMember(personId));
    }

    // ── Mutations ─────────────────────────────────────────────────────────────

    create(a: Association): void {
        this.associations.set(a.id, a);
        this.handleIndex.set(a.handle, a.id);
        this.loader?.save(a);
    }

    save(a: Association): void {
        this.loader?.save(a);
    }

    /** Soft-delete — sets active = false and persists. */
    deactivate(id: string): boolean {
        const a = this.associations.get(id);
        if (!a) return false;
        (a as unknown as Record<string, unknown>)["active"] = false;
        this.loader?.save(a);
        return true;
    }

    // ── Roster ────────────────────────────────────────────────────────────────

    addMember(associationId: string, personId: string): Association | null {
        const a = this.associations.get(associationId);
        if (!a) return null;
        a.addMember(personId);
        this.loader?.save(a);
        return a;
    }

    removeMember(associationId: string, personId: string): Association | null {
        const a = this.associations.get(associationId);
        if (!a) return null;
        a.removeMember(personId);
        this.loader?.save(a);
        return a;
    }

    addAdmin(associationId: string, personId: string): Association | null {
        const a = this.associations.get(associationId);
        if (!a) return null;
        a.addAdmin(personId);
        this.loader?.save(a);
        return a;
    }

    removeAdmin(associationId: string, personId: string): Association | null {
        const a = this.associations.get(associationId);
        if (!a) return null;
        a.removeAdmin(personId);
        this.loader?.save(a);
        return a;
    }
}
