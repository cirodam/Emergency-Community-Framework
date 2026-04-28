import { randomUUID } from "crypto";
import type { NetworkMember } from "@ecf/core";

/**
 * A federation that has joined this commonwealth.
 *
 * The commonwealth stores the federation's stable node identity so it can
 * verify signed requests from that federation without a round-trip.
 */
export interface CommonwealthMember extends NetworkMember {
    /** The federation's stable node ID (UUID). */
    federationNodeId: string;
    /** Hex SPKI DER Ed25519 public key — used to verify signed requests. */
    federationPublicKey: string;
    /**
     * Maximum kin deficit this federation may carry in its commonwealth account.
     * Computed on approval as: populationCount × constitution.creditLineKinPerPerson.
     */
    creditLineKin: number;
    /**
     * Total population across all member communities at application time.
     * Used to compute the credit line. Updated via census submissions.
     */
    populationCount: number;
}

export function createCommonwealthMember(
    name: string,
    handle: string,
    federationNodeId: string,
    federationPublicKey: string,
    url: string,
    entityId: string,
    isFounder = false,
    priority  = 1,
): CommonwealthMember {
    return {
        id:                 randomUUID(),
        entityId,
        federationNodeId,
        federationPublicKey,
        name,
        handle,
        url,
        joinedAt:           new Date().toISOString(),
        isFounder,
        bankAccountId:      null,
        creditLineKin:      0,
        populationCount:    0,
        priority,
    };
}
