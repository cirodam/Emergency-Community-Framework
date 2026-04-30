import { BaseDomainService } from "@ecf/core";
import { FederationFunctionalDomain } from "./FederationFunctionalDomain.js";

/**
 * FederationDomainService is the registry for all federation-level functional domains.
 *
 * Domains are code-defined singletons registered at startup.
 * Unlike the community DomainService, there is no unit/role/pool sub-system —
 * each federation domain manages its own entity types directly.
 */
export class FederationDomainService extends BaseDomainService<FederationFunctionalDomain> {
    private static instance: FederationDomainService;

    private constructor() { super(); }

    static getInstance(): FederationDomainService {
        if (!FederationDomainService.instance) FederationDomainService.instance = new FederationDomainService();
        return FederationDomainService.instance;
    }
}
