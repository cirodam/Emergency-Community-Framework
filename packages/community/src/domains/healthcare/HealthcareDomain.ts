import { FunctionalDomain } from "../../common/domain/FunctionalDomain.js";

export const HEALTHCARE_DOMAIN_ID = "ecf-domain-healthcare-000000008";

/**
 * Healthcare Domain — coordinates community health services.
 *
 * Functional units in this domain (instantiated from templates):
 *   - medicine-supply-office  Procurement, storage, and distribution of medicines (default)
 *   - primary-care-clinic     General medical care and preventive health (default)
 *   - dental-clinic           Dental examination, treatment, and hygiene
 */
export class HealthcareDomain extends FunctionalDomain {
    private static instance: HealthcareDomain;

    private constructor() {
        super(
            "Healthcare",
            "Coordinates community health services including primary care and dental care.",
            HEALTHCARE_DOMAIN_ID,
        );
    }

    static getInstance(): HealthcareDomain {
        if (!HealthcareDomain.instance) HealthcareDomain.instance = new HealthcareDomain();
        return HealthcareDomain.instance;
    }
}
