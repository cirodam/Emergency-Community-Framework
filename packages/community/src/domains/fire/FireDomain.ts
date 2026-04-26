import { FunctionalDomain } from "../../common/domain/FunctionalDomain.js";

export const FIRE_DOMAIN_ID = "ecf-domain-fire-000000015";

/**
 * Fire Domain — coordinates community fire prevention and response.
 *
 * Functional units in this domain (instantiated from templates):
 *   - fire-station           Staffed response unit for structural and wildland fires
 *   - fire-prevention-office Inspections, community education, and hazard reduction
 */
export class FireDomain extends FunctionalDomain {
    private static instance: FireDomain;

    private constructor() {
        super(
            "Fire",
            "Coordinates community fire prevention, suppression, and rescue response.",
            FIRE_DOMAIN_ID,
        );
    }

    static getInstance(): FireDomain {
        if (!FireDomain.instance) FireDomain.instance = new FireDomain();
        return FireDomain.instance;
    }
}
