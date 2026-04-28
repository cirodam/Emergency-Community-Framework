/**
 * Shared base for federation-layer, commonwealth-layer, and globe-layer member records.
 *
 * An entity (an organization such as a community, federation, or commonwealth) is
 * identified by `entityId` and may be represented by multiple nodes. `priority`
 * (ascending integer, 1 = most preferred) determines which node receives routed
 * payments when several nodes share the same handle.
 */
export interface NetworkMember {
    /** Parent-layer-assigned record UUID — unique per node registration. */
    id:            string;
    /** Stable organization UUID, self-reported at application time.
     *  All nodes belonging to the same entity share this value. */
    entityId:      string;
    /** Human-readable organization name. */
    name:          string;
    /** URL-safe handle identifying the entity within the parent layer. */
    handle:        string;
    /** Base URL of this specific node — used for directed-payment forwarding. */
    url:           string;
    /** ISO 8601 timestamp of when this node was admitted. */
    joinedAt:      string;
    /** True for the entity that founded the parent layer. */
    isFounder:     boolean;
    /** Clearing account at the parent-layer bank. null until provisioned. */
    bankAccountId: string | null;
    /**
     * Routing priority — lower integer is preferred.
     * When multiple nodes share the same handle, payments are forwarded to the
     * node with the smallest priority value that has a bank account.
     */
    priority:      number;
}

/**
 * A routable address identifies a community (or anything at/above community level)
 * without revealing any information about individuals within it.
 *
 * Format: "commonwealth:federation:community"
 * Example: "atlantic:north-georgia:maplewood"
 *
 * This is the ONLY address form that may be transmitted outside the community.
 * Person-level identity is never encoded in an externally visible address.
 */
export interface RoutableAddress {
    readonly commonwealth: string;
    readonly federation:   string;
    readonly community:    string;
}

/**
 * A payment token allows an external payer to route funds to a specific person
 * inside a community without revealing who that person is.
 *
 * The token is an opaque UUID issued by the community, meaningful only to
 * the community node that issued it.
 *
 * Tokens may be single-use or reusable, and can be rotated by the community.
 */
export interface PaymentToken {
    readonly address: RoutableAddress;
    readonly token:   string;   // opaque UUID, community-issued
}

/**
 * Parse "commonwealth:federation:community" into a RoutableAddress.
 * Throws if the string does not have exactly three non-empty colon-separated segments.
 */
export function parseRoutableAddress(raw: string): RoutableAddress {
    const parts = raw.split(":");
    if (parts.length !== 3) {
        throw new Error(
            `Invalid routable address "${raw}": expected "commonwealth:federation:community"`,
        );
    }
    const [commonwealth, federation, community] = parts;
    if (!commonwealth || !federation || !community) {
        throw new Error(
            `Invalid routable address "${raw}": segments must be non-empty`,
        );
    }
    return { commonwealth, federation, community };
}

/** Serialize a RoutableAddress to "commonwealth:federation:community". */
export function serializeRoutableAddress(addr: RoutableAddress): string {
    return `${addr.commonwealth}:${addr.federation}:${addr.community}`;
}

/** Returns true if two RoutableAddresses refer to the same community. */
export function addressesMatch(a: RoutableAddress, b: RoutableAddress): boolean {
    return a.commonwealth === b.commonwealth &&
           a.federation   === b.federation   &&
           a.community    === b.community;
}
