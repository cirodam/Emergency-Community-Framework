import { FunctionalDomain } from "../../common/domain/FunctionalDomain.js";

export const ENRICHMENT_DOMAIN_ID = "ecf-domain-enrichment-000000019";

/**
 * Enrichment Domain — coordinates community cultural life, recreation, and social events.
 *
 * Functional units in this domain (instantiated from templates):
 *   - events-team            Plans and runs community gatherings, festivals, and ceremonies
 *   - sports-and-recreation  Manages sports facilities, leagues, and outdoor recreation
 *   - arts-and-culture       Supports music, visual arts, theatre, and cultural expression
 */
export class EnrichmentDomain extends FunctionalDomain {
    private static instance: EnrichmentDomain;

    private constructor() {
        super(
            "Enrichment",
            "Coordinates community cultural life, recreational activities, and social events that sustain wellbeing and cohesion.",
            ENRICHMENT_DOMAIN_ID,
        );
    }

    static getInstance(): EnrichmentDomain {
        if (!EnrichmentDomain.instance) EnrichmentDomain.instance = new EnrichmentDomain();
        return EnrichmentDomain.instance;
    }
}
