import { GlobeFunctionalDomain } from "./GlobeFunctionalDomain.js";

/**
 * GlobeDomainService is the registry for all globe-level functional domains.
 *
 * Domains are code-defined singletons registered at startup.
 */
export class GlobeDomainService {
    private static instance: GlobeDomainService;
    private domains: Map<string, GlobeFunctionalDomain> = new Map();

    private constructor() {}

    static getInstance(): GlobeDomainService {
        if (!GlobeDomainService.instance) GlobeDomainService.instance = new GlobeDomainService();
        return GlobeDomainService.instance;
    }

    registerDomain(domain: GlobeFunctionalDomain): void {
        this.domains.set(domain.id, domain);
    }

    getDomain(id: string): GlobeFunctionalDomain | undefined {
        return this.domains.get(id);
    }

    getDomains(): GlobeFunctionalDomain[] {
        return Array.from(this.domains.values());
    }
}
