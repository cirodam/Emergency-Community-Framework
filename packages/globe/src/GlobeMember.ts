import { randomUUID } from "crypto";
import type { NetworkMember } from "@ecf/core";

/**
 * A commonwealth that has joined the globe layer.
 *
 * The globe stores the commonwealth's stable node identity so it can
 * verify signed requests without a round-trip.
 */
export interface GlobeMember extends NetworkMember {
    /** The commonwealth's stable node ID (UUID). */
    commonwealthNodeId: string;
    /** Hex SPKI DER Ed25519 public key — used to verify signed requests. */
    commonwealthPublicKey: string;
    /**
     * Maximum kin deficit this commonwealth may carry in its globe account.
     * Computed on approval as: populationCount × constitution.creditLineKinPerPerson.
     */
    creditLineKin: number;
    /**
     * Total population across all member communities (through federation and
     * commonwealth layers) at application time. Used to compute the credit line.
     */
    populationCount: number;
}

export function createGlobeMember(
    name: string,
    handle: string,
    commonwealthNodeId: string,
    commonwealthPublicKey: string,
    url: string,
    entityId: string,
    isFounder = false,
    priority  = 1,
): GlobeMember {
    return {
        id:                    randomUUID(),
        entityId,
        commonwealthNodeId,
        commonwealthPublicKey,
        name,
        handle,
        url,
        joinedAt:              new Date().toISOString(),
        isFounder,
        bankAccountId:         null,
        creditLineKin:         0,
        populationCount:       0,
        priority,
    };
}
