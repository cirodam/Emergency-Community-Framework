import { FunctionalDomain } from "../../common/domain/FunctionalDomain.js";

export const COMMUNICATIONS_DOMAIN_ID = "ecf-domain-communications-000000011";

/**
 * Communications Domain — coordinates community information infrastructure.
 *
 * Functional units in this domain (instantiated from templates):
 *   - community-radio            Broadcast radio for news, alerts, and coordination
 *   - mesh-network-office        Local mesh internet and data networking
 *   - postal-service             Physical message and parcel delivery within the community
 *   - telecommunications-office  Telephone, VoIP, satellite, and emergency radio relay
 */
export class CommunicationsDomain extends FunctionalDomain {
    private static instance: CommunicationsDomain;

    private constructor() {
        super(
            "Communications",
            "Coordinates community information infrastructure including radio broadcast, mesh networking, and postal delivery.",
            COMMUNICATIONS_DOMAIN_ID,
        );
    }

    static getInstance(): CommunicationsDomain {
        if (!CommunicationsDomain.instance) CommunicationsDomain.instance = new CommunicationsDomain();
        return CommunicationsDomain.instance;
    }
}
