import { FederationFunctionalDomain } from "../../common/FederationFunctionalDomain.js";

export const INSURANCE_DOMAIN_ID = "ecf-federation-domain-insurance-000001";

/**
 * Insurance Domain — the federation's mutual insurance function.
 *
 * At the federation level, the insurance domain coordinates:
 *   - Inter-community reinsurance (backstop for depleted community pools)
 *   - Standards and oversight for community-level insurance societies
 *   - Mutual aid disbursements when a community faces catastrophic loss
 *
 * Each member community may operate its own insurance societies (health,
 * property, crop, etc.) under this domain's standards. The federation
 * reinsurance pool — funded from the federation treasury — acts as the
 * lender of last resort when a community pool cannot meet claims.
 */
export class InsuranceDomain extends FederationFunctionalDomain {
    private static instance: InsuranceDomain;

    private constructor() {
        super(
            "Insurance",
            "Coordinates inter-community reinsurance, mutual insurance standards, and catastrophic loss mutual aid across the federation.",
            INSURANCE_DOMAIN_ID,
        );
    }

    static getInstance(): InsuranceDomain {
        if (!InsuranceDomain.instance) InsuranceDomain.instance = new InsuranceDomain();
        return InsuranceDomain.instance;
    }
}
