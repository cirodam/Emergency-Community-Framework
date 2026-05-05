import { FunctionalDomain } from "../../common/domain/FunctionalDomain.js";

export const MEDIATION_DOMAIN_ID = "ecf-domain-mediation-000000024";

/**
 * Mediation Domain — provides structured conflict resolution before disputes
 * escalate to the formal governance track.
 *
 * Mediators are not judges. They hold space for parties to reach mutual
 * understanding; they do not impose outcomes. If mediation fails, the matter
 * can be brought to the Assembly as a formal motion.
 *
 * Functional units in this domain (instantiated from templates):
 *   - mediation-panel   Trained mediators available to facilitate disputes
 */
export class MediationDomain extends FunctionalDomain {
    private static instance: MediationDomain;

    private constructor() {
        super(
            "Mediation",
            "Provides structured, non-adversarial conflict resolution for community members. The informal tier before formal governance.",
            MEDIATION_DOMAIN_ID,
        );
    }

    static getInstance(): MediationDomain {
        if (!MediationDomain.instance) MediationDomain.instance = new MediationDomain();
        return MediationDomain.instance;
    }
}
