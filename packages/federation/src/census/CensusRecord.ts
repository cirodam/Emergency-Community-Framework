export interface CensusRecord {
    /** Federation member ID (matches FederationMember.id). Used as the storage key. */
    communityId: string;
    /** Number of members the community claims. */
    memberCount: number;
    /**
     * One HMAC-SHA256 nullifier per member, derived from each person's public key.
     * Lets the federation detect double-counting without learning who the people are.
     */
    nullifiers: string[];
    /** ISO 8601 timestamp of the most recent submission from this community. */
    submittedAt: string;
    /**
     * Nullifiers that also appeared in at least one other community's census at
     * the time of submission. Populated by FederationCensusService.
     */
    duplicates: string[];
}
