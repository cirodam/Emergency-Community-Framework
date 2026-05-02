import { Organization } from "./Organization.js";
import { OrgLoader } from "./OrgLoader.js";
import { HandleRegistry } from "../HandleRegistry.js";

const HANDLE_RE = /^[a-z0-9][a-z0-9-]{0,30}[a-z0-9]$|^[a-z0-9]{1,2}$/;

export class OrgService {
    private static instance: OrgService;

    private orgs:   Map<string, Organization> = new Map();
    private loader: OrgLoader | null = null;

    private constructor() {}

    static getInstance(): OrgService {
        if (!OrgService.instance) OrgService.instance = new OrgService();
        return OrgService.instance;
    }

    init(loader: OrgLoader): void {
        this.loader = loader;
        for (const org of loader.loadAll()) {
            this.orgs.set(org.id, org);
            HandleRegistry.getInstance().register(org.handle, "organization", org.id);
        }
    }

    // ── Queries ───────────────────────────────────────────────────────────────

    getAll(): Organization[] {
        return [...this.orgs.values()];
    }

    getActive(): Organization[] {
        return [...this.orgs.values()].filter(o => o.isActive);
    }

    get(id: string): Organization | undefined {
        return this.orgs.get(id);
    }

    getByHandle(handle: string): Organization | undefined {
        return [...this.orgs.values()].find(o => o.handle === handle);
    }

    /** All active orgs a person is a member of. */
    orgsForPerson(personId: string): Organization[] {
        return this.getActive().filter(o => o.memberIds.includes(personId));
    }

    // ── Mutations ─────────────────────────────────────────────────────────────

    create(handle: string, name: string, foundedBy: string, description?: string | null): Organization {
        const normalized = handle.toLowerCase().replace(/[^a-z0-9-]/g, "");
        if (!HANDLE_RE.test(normalized)) {
            throw new Error("Handle must be 1–32 lowercase alphanumeric characters or hyphens, not starting/ending with a hyphen");
        }
        if (this.getByHandle(normalized)) {
            throw new Error(`Handle '${normalized}' is already taken`);
        }
        if (HandleRegistry.getInstance().isTaken(normalized)) {
            throw new Error(`Handle '${normalized}' is already taken by another entity`);
        }
        if (!name.trim()) {
            throw new Error("name is required");
        }
        const org = new Organization(normalized, name, foundedBy, description ?? null);
        this.orgs.set(org.id, org);
        HandleRegistry.getInstance().register(org.handle, "organization", org.id);
        this.loader!.save(org);
        return org;
    }

    addMember(orgId: string, personId: string): Organization {
        const org = this.orgs.get(orgId);
        if (!org) throw new Error("Organization not found");
        if (!org.isActive) throw new Error("Organization is dissolved");
        org.addMember(personId);
        this.loader!.save(org);
        return org;
    }

    removeMember(orgId: string, personId: string): Organization {
        const org = this.orgs.get(orgId);
        if (!org) throw new Error("Organization not found");
        if (!org.isActive) throw new Error("Organization is dissolved");
        org.removeMember(personId);
        // Auto-dissolve when the last member leaves
        if (org.memberIds.length === 0) {
            org.dissolve();
        }
        this.loader!.save(org);
        return org;
    }

    dissolve(orgId: string): Organization {
        const org = this.orgs.get(orgId);
        if (!org) throw new Error("Organization not found");
        if (!org.isActive) throw new Error("Organization is already dissolved");
        org.dissolve();
        this.loader!.save(org);
        return org;
    }
}
