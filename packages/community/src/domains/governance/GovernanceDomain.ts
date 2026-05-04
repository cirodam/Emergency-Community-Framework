import { FunctionalDomain } from "../../common/domain/FunctionalDomain.js";

export const GOVERNANCE_DOMAIN_ID = "ecf-domain-governance-000000023";

/**
 * Governance Institution — administers the assembly, maintains procedural records,
 * and provides the human infrastructure that makes community self-governance work.
 *
 * Functional units in this domain:
 *   - assembly   Seats the community assembly; draws members by sortition each term
 */
export class GovernanceDomain extends FunctionalDomain {
    private static instance: GovernanceDomain;

    private constructor() {
        super(
            "Governance",
            "Administers the community assembly, maintains procedural records, and provides the human infrastructure for democratic self-governance.",
            GOVERNANCE_DOMAIN_ID,
        );
    }

    static getInstance(): GovernanceDomain {
        if (!GovernanceDomain.instance) GovernanceDomain.instance = new GovernanceDomain();
        return GovernanceDomain.instance;
    }
}
