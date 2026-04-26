import { FunctionalDomain } from "../../common/domain/FunctionalDomain.js";

export const COURIER_DOMAIN_ID = "ecf-domain-courier-000000021";

/**
 * Courier Domain — coordinates intra-community parcel and mail delivery.
 *
 * Functional units in this domain (instantiated from templates):
 *   - local-delivery-team    Door-to-door parcel and mail delivery within the community
 *   - parcel-depot           Receiving, sorting, and holding hub for packages
 *   - inter-community-courier Runs scheduled delivery routes to neighbouring communities
 */
export class CourierDomain extends FunctionalDomain {
    private static instance: CourierDomain;

    private constructor() {
        super(
            "Courier",
            "Coordinates the movement of packages, goods, and mail items within the community and to neighbouring settlements.",
            COURIER_DOMAIN_ID,
        );
    }

    static getInstance(): CourierDomain {
        if (!CourierDomain.instance) CourierDomain.instance = new CourierDomain();
        return CourierDomain.instance;
    }
}
