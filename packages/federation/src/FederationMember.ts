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
    /** URL-safe handle chosen by the community, unique within this federation.
     *  Used in addresses: federation:community-handle:member-handle */
    handle: string;
    /** ISO 8601 join timestamp. */
    joinedAt: string;
    /**
     * True for the community that founded the federation. Founders bypass
     * the application process and are registered at first boot.
     */
    isFounder: boolean;
    /**
     * The account ID at the federation bank where this community holds kithe.
     * Populated immediately after joining.
     */
    bankAccountId: string | null;
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
    isFounder = false,
): FederationMember {
    return {
        id:                 randomUUID(),
        communityNodeId,
        communityPublicKey,
        name,
        handle,
        joinedAt:           new Date().toISOString(),
        isFounder,
        bankAccountId:      null,
        creditLineKin:      0,
    };
}
