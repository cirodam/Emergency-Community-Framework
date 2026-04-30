import { BaseDomainService } from "@ecf/core";
import { CommonwealthFunctionalDomain } from "./CommonwealthFunctionalDomain.js";

/**
 * CommonwealthDomainService is the registry for all commonwealth-level functional domains.
 *
 * Domains are code-defined singletons registered at startup.
 */
export class CommonwealthDomainService extends BaseDomainService<CommonwealthFunctionalDomain> {
    private static instance: CommonwealthDomainService;

    private constructor() { super(); }

    static getInstance(): CommonwealthDomainService {
        if (!CommonwealthDomainService.instance) CommonwealthDomainService.instance = new CommonwealthDomainService();
        return CommonwealthDomainService.instance;
    }
}
