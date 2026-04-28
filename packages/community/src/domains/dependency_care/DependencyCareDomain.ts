import { FunctionalDomain } from "../../common/domain/FunctionalDomain.js";

export const DEPENDENCY_CARE_DOMAIN_ID = "ecf-domain-dependency-care-000000017";

/**
 * Dependency Care Domain — coordinates care for elderly and disabled community members.
 *
 * Functional units in this domain (instantiated from templates):
 *   - community-outreach-team  Identifies at-risk members and coordinates delivery of food, medicine, and care (default)
 *   - elder-care-home          Residential and day care for older adults
 *   - disability-support       Personal assistance, adaptive aids, and inclusion services
 *   - palliative-care-unit     Comfort-focused care for those with life-limiting conditions
 */
export class DependencyCareDomain extends FunctionalDomain {
    private static instance: DependencyCareDomain;

    private constructor() {
        super(
            "Dependency Care",
            "Coordinates community care services for elderly, disabled, and chronically ill members requiring ongoing support.",
            DEPENDENCY_CARE_DOMAIN_ID,
        );
    }

    static getInstance(): DependencyCareDomain {
        if (!DependencyCareDomain.instance) DependencyCareDomain.instance = new DependencyCareDomain();
        return DependencyCareDomain.instance;
    }
}
