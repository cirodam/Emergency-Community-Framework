import { BaseFunctionalDomain } from "./BaseFunctionalDomain.js";

/**
 * Generic registry for code-defined domain singletons.
 *
 * Extend this class and add a static `getInstance()` singleton for each
 * layer (FederationDomainService, CommonwealthDomainService, etc.).
 */
export class BaseDomainService<T extends BaseFunctionalDomain> {
    protected readonly domains = new Map<string, T>();

    registerDomain(domain: T): void {
        this.domains.set(domain.id, domain);
    }

    getDomain(id: string): T | undefined {
        return this.domains.get(id);
    }

    getDomains(): T[] {
        return [...this.domains.values()];
    }
}
