import { BaseDomainService } from "@ecf/core";
import { GlobeFunctionalDomain } from "./GlobeFunctionalDomain.js";

/**
 * GlobeDomainService is the registry for all globe-level functional domains.
 *
 * Domains are code-defined singletons registered at startup.
 */
export class GlobeDomainService extends BaseDomainService<GlobeFunctionalDomain> {
    private static instance: GlobeDomainService;

    private constructor() { super(); }

    static getInstance(): GlobeDomainService {
        if (!GlobeDomainService.instance) GlobeDomainService.instance = new GlobeDomainService();
        return GlobeDomainService.instance;
    }
}
