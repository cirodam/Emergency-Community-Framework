import { FederationFunctionalDomain } from "../../common/FederationFunctionalDomain.js";

export const LOGISTICS_DOMAIN_ID = "ecf-federation-domain-logistics-000002";

/**
 * Logistics Domain — the federation's inter-community supply chain and freight function.
 *
 * At the federation level, the logistics domain coordinates:
 *   - Inter-community freight routes and shared cargo networks
 *   - Strategic stockpile management and supply allocation in crisis conditions
 *   - Standards and protocols for goods movement between member communities
 *   - Shared warehousing and distribution hub infrastructure
 *
 * Each member community operates its own courier and transit domains; this
 * domain governs the federation-wide layer that connects them — bulk cargo,
 * strategic reserves, and supply routing decisions that span community borders.
 */
export class LogisticsDomain extends FederationFunctionalDomain {
    private static instance: LogisticsDomain;

    private constructor() {
        super(
            "Logistics",
            "Coordinates inter-community freight routes, strategic stockpile management, and supply chain standards across the federation.",
            LOGISTICS_DOMAIN_ID,
        );
    }

    static getInstance(): LogisticsDomain {
        if (!LogisticsDomain.instance) LogisticsDomain.instance = new LogisticsDomain();
        return LogisticsDomain.instance;
    }
}
