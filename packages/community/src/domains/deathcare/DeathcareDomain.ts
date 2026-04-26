import { FunctionalDomain } from "../../common/domain/FunctionalDomain.js";

export const DEATHCARE_DOMAIN_ID = "ecf-domain-deathcare-000000012";

/**
 * Deathcare Domain — coordinates community end-of-life services.
 *
 * Functional units in this domain (instantiated from templates):
 *   - mortuary-service       Prepares and stores remains with dignity
 *   - burial-ground-office   Manages cemetery records and interment
 *   - grief-support-circle   Counselling and communal mourning support
 */
export class DeathcareDomain extends FunctionalDomain {
    private static instance: DeathcareDomain;

    private constructor() {
        super(
            "Deathcare",
            "Coordinates community end-of-life services including mortuary care, burial, and grief support.",
            DEATHCARE_DOMAIN_ID,
        );
    }

    static getInstance(): DeathcareDomain {
        if (!DeathcareDomain.instance) DeathcareDomain.instance = new DeathcareDomain();
        return DeathcareDomain.instance;
    }
}
