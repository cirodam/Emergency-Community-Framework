import { FunctionalDomain } from "../../common/domain/FunctionalDomain.js";

export const WATER_DOMAIN_ID = "ecf-domain-water-000000014";

/**
 * Water Domain — coordinates community water sourcing, storage, and distribution.
 *
 * Functional units in this domain (instantiated from templates):
 *   - well-and-extraction    Manages wells, boreholes, and surface water intake
 *   - reservoir-and-storage  Operates cisterns, tanks, and reservoir infrastructure
 *   - irrigation-office      Plans and maintains irrigation systems for agriculture
 */
export class WaterDomain extends FunctionalDomain {
    private static instance: WaterDomain;

    private constructor() {
        super(
            "Water",
            "Coordinates community water sourcing, storage, and distribution including wells, reservoirs, and irrigation.",
            WATER_DOMAIN_ID,
        );
    }

    static getInstance(): WaterDomain {
        if (!WaterDomain.instance) WaterDomain.instance = new WaterDomain();
        return WaterDomain.instance;
    }
}
