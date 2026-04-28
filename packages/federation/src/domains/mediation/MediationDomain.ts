import { FederationFunctionalDomain } from "../../common/FederationFunctionalDomain.js";

export const FEDERATION_MEDIATION_DOMAIN_ID = "ecf-federation-domain-mediation-000001";

/**
 * Mediation Domain — the federation's dispute resolution function.
 *
 * Handles conflicts that cannot be resolved within a single community:
 *   - Inter-community disputes (resource access, boundary, contractual)
 *   - Complaints by a member community against another member community
 *   - Appeals of federation-level governance decisions
 *   - Mediation of conflicts involving the federation itself as a party
 *
 * The domain operates through trained mediators drawn from member communities
 * under rotation, ensuring no single community controls the process.
 * Mediation is non-binding by default; arbitration (binding) requires
 * both parties to opt in or the federation assembly to invoke it.
 */
export class MediationDomain extends FederationFunctionalDomain {
    private static instance: MediationDomain;

    private constructor() {
        super(
            "Mediation",
            "Resolves inter-community disputes, handles appeals of federation governance decisions, and provides arbitration when both parties consent.",
            FEDERATION_MEDIATION_DOMAIN_ID,
        );
    }

    static getInstance(): MediationDomain {
        if (!MediationDomain.instance) MediationDomain.instance = new MediationDomain();
        return MediationDomain.instance;
    }
}
