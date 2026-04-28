import { CommonwealthFunctionalDomain } from "./CommonwealthFunctionalDomain.js";

/**
 * CommonwealthDomainService is the registry for all commonwealth-level functional domains.
 *
 * Domains are code-defined singletons registered at startup.
 */
export class CommonwealthDomainService {
    private static instance: CommonwealthDomainService;
    private domains: Map<string, CommonwealthFunctionalDomain> = new Map();

    private constructor() {}

    static getInstance(): CommonwealthDomainService {
        if (!CommonwealthDomainService.instance) CommonwealthDomainService.instance = new CommonwealthDomainService();
        return CommonwealthDomainService.instance;
    }

    registerDomain(domain: CommonwealthFunctionalDomain): void {
        this.domains.set(domain.id, domain);
    }

    getDomain(id: string): CommonwealthFunctionalDomain | undefined {
        return this.domains.get(id);
    }

    getDomains(): CommonwealthFunctionalDomain[] {
        return Array.from(this.domains.values());
    }
}
