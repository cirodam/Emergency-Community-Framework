import { randomUUID } from "crypto";
import type { NetworkMember } from "@ecf/core";

/**
 * A community that has joined this federation.
 *
 * The federation stores the community's stable node identity so that it can
 * verify signed requests from that community without a round-trip to the
 * community node.
 */
export interface FederationMember extends NetworkMember {
    /** The community's stable node ID (UUID). */
    communityNodeId: string;
    /** Hex SPKI DER Ed25519 public key — used to verify signed requests. */
    communityPublicKey: string;
    /**
     * Maximum kin deficit this community may carry in its federation account.
     * Computed on approval as: memberCount × constitution.creditLineKinPerPerson.
     * Zero until the credit line is explicitly set.
     */
    creditLineKin: number;
}

export function createFederationMember(
    name: string,
    handle: string,
    communityNodeId: string,
    communityPublicKey: string,
    url: string,
    entityId: string,
    isFounder = false,
    priority  = 1,
): FederationMember {
    return {
        id:                 randomUUID(),
        entityId,
        communityNodeId,
        communityPublicKey,
        name,
        handle,
        url,
        joinedAt:           new Date().toISOString(),
        isFounder,
        bankAccountId:      null,
        creditLineKin:      0,
        priority,
    };
}
