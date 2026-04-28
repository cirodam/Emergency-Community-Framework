import { GlobeFunctionalDomain } from "../../common/GlobeFunctionalDomain.js";

export const GLOBE_MEDIATION_DOMAIN_ID = "ecf-globe-domain-mediation-000001";

/**
 * Mediation Domain — the globe's dispute resolution function.
 *
 * Handles conflicts that span member commonwealths:
 *   - Inter-commonwealth disputes (resource allocation, trade, migration)
 *   - Complaints by a member commonwealth against another member commonwealth
 *   - Appeals of globe-level governance decisions
 *   - Mediation of conflicts involving the globe itself as a party
 *
 * Mediators are drawn from member commonwealths under rotation.
 * Mediation is non-binding by default; arbitration (binding) requires
 * both parties to opt in or the globe assembly to invoke it.
 */
export class MediationDomain extends GlobeFunctionalDomain {
    private static instance: MediationDomain;

    private constructor() {
        super(
            "Mediation",
            "Resolves inter-commonwealth disputes, handles appeals of globe governance decisions, and provides arbitration when both parties consent.",
            GLOBE_MEDIATION_DOMAIN_ID,
        );
    }

    static getInstance(): MediationDomain {
        if (!MediationDomain.instance) MediationDomain.instance = new MediationDomain();
        return MediationDomain.instance;
    }
}
