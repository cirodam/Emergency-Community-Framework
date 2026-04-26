import { FunctionalDomain } from "../../common/domain/FunctionalDomain.js";

export const SANITATION_DOMAIN_ID = "ecf-domain-sanitation-000000013";

/**
 * Sanitation Domain — coordinates community waste and hygiene infrastructure.
 *
 * Functional units in this domain (instantiated from templates):
 *   - water-treatment-plant  Purifies drinking water and manages wastewater
 *   - waste-collection-team  Collects and sorts solid waste for disposal or recycling
 *   - composting-facility    Processes organic waste into compost for agriculture
 */
export class SanitationDomain extends FunctionalDomain {
    private static instance: SanitationDomain;

    private constructor() {
        super(
            "Sanitation",
            "Coordinates community waste management, water treatment, and hygiene infrastructure.",
            SANITATION_DOMAIN_ID,
        );
    }

    static getInstance(): SanitationDomain {
        if (!SanitationDomain.instance) SanitationDomain.instance = new SanitationDomain();
        return SanitationDomain.instance;
    }
}
