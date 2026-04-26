import { FunctionalDomain } from "../../common/domain/FunctionalDomain.js";

export const HOUSING_DOMAIN_ID = "ecf-domain-housing-000000009";

/**
 * Housing Domain — coordinates community shelter and construction.
 *
 * Functional units in this domain (instantiated from templates):
 *   - housing-committee      Allocates and manages dwelling assignments
 *   - construction-crew      Builds and maintains community structures
 *   - maintenance-workshop   Repairs, tools, and materials stewardship
 */
export class HousingDomain extends FunctionalDomain {
    private static instance: HousingDomain;

    private constructor() {
        super(
            "Housing",
            "Coordinates community shelter, dwelling allocation, construction, and maintenance.",
            HOUSING_DOMAIN_ID,
        );
    }

    static getInstance(): HousingDomain {
        if (!HousingDomain.instance) HousingDomain.instance = new HousingDomain();
        return HousingDomain.instance;
    }
}
