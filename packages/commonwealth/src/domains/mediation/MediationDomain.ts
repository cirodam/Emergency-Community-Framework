import { CommonwealthFunctionalDomain } from "../../common/CommonwealthFunctionalDomain.js";

export const COMMONWEALTH_MEDIATION_DOMAIN_ID = "ecf-commonwealth-domain-mediation-000001";

/**
 * Mediation Domain — the commonwealth's dispute resolution function.
 *
 * Handles conflicts that span member federations:
 *   - Inter-federation disputes (resource allocation, trade, migration)
 *   - Complaints by a member federation against another member federation
 *   - Appeals of commonwealth-level governance decisions
 *   - Mediation of conflicts involving the commonwealth itself as a party
 *
 * Mediators are drawn from member federations under rotation.
 * Mediation is non-binding by default; arbitration (binding) requires
 * both parties to opt in or the commonwealth assembly to invoke it.
 */
export class MediationDomain extends CommonwealthFunctionalDomain {
    private static instance: MediationDomain;

    private constructor() {
        super(
            "Mediation",
            "Resolves inter-federation disputes, handles appeals of commonwealth governance decisions, and provides arbitration when both parties consent.",
            COMMONWEALTH_MEDIATION_DOMAIN_ID,
        );
    }

    static getInstance(): MediationDomain {
        if (!MediationDomain.instance) MediationDomain.instance = new MediationDomain();
        return MediationDomain.instance;
    }
}
