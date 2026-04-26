import { FunctionalDomain } from "../../common/domain/FunctionalDomain.js";

export const TRANSIT_DOMAIN_ID = "ecf-domain-transit-000000020";

/**
 * Transit Domain — coordinates movement of people within and between communities.
 *
 * Functional units in this domain (instantiated from templates):
 *   - bus-and-shuttle-service   Scheduled vehicle routes within the community
 *   - cycling-office            Bicycle fleet, paths, and active transport infrastructure
 *   - transport-dispatch        On-demand trips and emergency patient transport
 */
export class TransitDomain extends FunctionalDomain {
    private static instance: TransitDomain;

    private constructor() {
        super(
            "Transit",
            "Coordinates the movement of community members via scheduled routes, cycling infrastructure, and on-demand transport.",
            TRANSIT_DOMAIN_ID,
        );
    }

    static getInstance(): TransitDomain {
        if (!TransitDomain.instance) TransitDomain.instance = new TransitDomain();
        return TransitDomain.instance;
    }
}
