import { FunctionalDomain } from "../../common/domain/FunctionalDomain.js";

export const FOOD_DOMAIN_ID = "ecf-domain-food-000000006";

/**
 * Food Domain — coordinates community food processing and preparation.
 *
 * Functional units in this domain (instantiated from templates):
 *   - food-supply-office  Central office for food procurement, storage, and distribution (default)
 *   - community-kitchen   Raw and cooked food preparation for the community (default)
 *   - grain-mill          Grain processing: milling, hulling, and storage
 *
 * The domain has no monetary operations of its own — payroll and budget
 * allocation flow through DomainService and the Community Treasury like
 * any other domain.
 */
export class FoodDomain extends FunctionalDomain {
    private static instance: FoodDomain;

    private constructor() {
        super(
            "Food",
            "Coordinates community food processing and preparation, including communal kitchens and grain milling.",
            FOOD_DOMAIN_ID,
        );
    }

    static getInstance(): FoodDomain {
        if (!FoodDomain.instance) FoodDomain.instance = new FoodDomain();
        return FoodDomain.instance;
    }
}
