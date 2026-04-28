import { FunctionalDomain } from "../../common/domain/FunctionalDomain.js";

export const AGRICULTURE_DOMAIN_ID = "ecf-domain-agriculture-000000007";

/**
 * Agriculture Domain — coordinates land use, cultivation, and seed stewardship.
 *
 * Functional units in this domain (instantiated from templates):
 *   - farm-coordination-office  Coordinates land, planting schedules, equipment, and harvest logistics (default)
 *   - seed-library               Community-managed seed saving, cataloguing, and lending
 */
export class AgricultureDomain extends FunctionalDomain {
    private static instance: AgricultureDomain;

    private constructor() {
        super(
            "Agriculture",
            "Coordinates land use, cultivation, and seed stewardship for the community.",
            AGRICULTURE_DOMAIN_ID,
        );
    }

    static getInstance(): AgricultureDomain {
        if (!AgricultureDomain.instance) AgricultureDomain.instance = new AgricultureDomain();
        return AgricultureDomain.instance;
    }
}
