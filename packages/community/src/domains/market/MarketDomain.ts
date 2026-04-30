import { FunctionalDomain } from "../../common/domain/FunctionalDomain.js";

export const MARKET_DOMAIN_ID = "ecf-domain-market-000000022";

/**
 * Market Domain — oversees physical marketplaces where community members and
 * outside traders exchange goods and surplus produce.
 *
 * Functional units in this domain (instantiated from templates):
 *   - marketplace    A physical marketplace with a dedicated coordinator
 */
export class MarketDomain extends FunctionalDomain {
    private static instance: MarketDomain;

    private constructor() {
        super(
            "Market",
            "Oversees physical marketplaces where community members and outside traders exchange goods, surplus produce, and services.",
            MARKET_DOMAIN_ID,
        );
    }

    static getInstance(): MarketDomain {
        if (!MarketDomain.instance) MarketDomain.instance = new MarketDomain();
        return MarketDomain.instance;
    }
}
