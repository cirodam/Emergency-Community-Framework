import { FunctionalDomain } from "../../common/domain/FunctionalDomain.js";

export const CHILDCARE_DOMAIN_ID = "ecf-domain-childcare-000000016";

/**
 * Childcare Domain — coordinates community child development and early education.
 *
 * Functional units in this domain (instantiated from templates):
 *   - nursery            Care for infants and toddlers (0–3 years)
 *   - kindergarten       Early childhood education and play (3–6 years)
 *   - after-school-club  Supervised activities and homework support for school-age children
 */
export class ChildcareDomain extends FunctionalDomain {
    private static instance: ChildcareDomain;

    private constructor() {
        super(
            "Childcare",
            "Coordinates community child development, early education, and supervised care for children of all ages.",
            CHILDCARE_DOMAIN_ID,
        );
    }

    static getInstance(): ChildcareDomain {
        if (!ChildcareDomain.instance) ChildcareDomain.instance = new ChildcareDomain();
        return ChildcareDomain.instance;
    }
}
