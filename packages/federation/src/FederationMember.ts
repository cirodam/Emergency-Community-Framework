import { randomUUID } from "crypto";

/**
 * A community that has joined this federation.
 *
 * The federation stores the community's stable node identity so that it can
 * verify signed requests from that community without a round-trip to the
 * community node.
 */
export interface FederationMember {
    /** Federation-assigned opaque ID for this member community. */
    id: string;
    /** The community's stable node ID (UUID). */
    communityNodeId: string;
    /** Hex SPKI DER Ed25519 public key — used to verify signed requests. */
    communityPublicKey: string;
    /** Human-readable name, e.g. "Riverside Community". */
    name: string;
    /** ISO 8601 join timestamp. */
    joinedAt: string;
    /**
     * The account ID at the federation bank where this community holds kithe.
     * Populated immediately after joining.
     */
    bankAccountId: string | null;
}

export function createFederationMember(
    name: string,
    communityNodeId: string,
    communityPublicKey: string,
): FederationMember {
    return {
        id:                 randomUUID(),
        communityNodeId,
        communityPublicKey,
        name,
        joinedAt:           new Date().toISOString(),
        bankAccountId:      null,
    };
}
