// ── Types ─────────────────────────────────────────────────────────────────────

/** How the approval threshold is measured. */
export type VoteLegitimacy =
    | "absolute-majority"   // N% of ALL eligible voters must affirmatively approve
    | "majority-of-votes"   // N% of votes CAST must approve
    | "petition";           // fixed minApprovals count; no reject side

/** Which governing body has jurisdiction over this vote. */
export type VoteJurisdiction = "referendum" | "assembly" | "pool";

/** Who is eligible to cast a ballot. */
export type VoteEligibility = "all-members" | "assembly-members" | "pool-members";

export interface VoteRule {
    id:                string;
    label:             string;
    jurisdiction:      VoteJurisdiction;
    eligibility:       VoteEligibility;
    legitimacy:        VoteLegitimacy;
    /**
     * Fraction of eligible voters required to pass.
     * - absolute-majority: fraction of ALL eligible voters
     * - majority-of-votes: fraction of votes CAST
     * - petition: not used (use minApprovals on the motion instead)
     */
    thresholdFraction?: number;
    /** Minimum days of deliberation before voting may open. 0 = no deliberation period. */
    deliberationDays:   number;
    /**
     * How long the voting window stays open in days.
     * 0 = no time-based deadline (petition closes when threshold is hit).
     */
    votingWindowDays:   number;
}

// ── Built-in rules ────────────────────────────────────────────────────────────

export const VOTE_RULES: Record<string, VoteRule> = {
    /**
     * Constitutional Referendum — highest bar.
     * Requires 2/3 of ALL members to approve. 7-day deliberation, 14-day voting window.
     * Use for: constitutional amendments, founding/dissolving institutions.
     */
    "referendum-constitutional": {
        id:                "referendum-constitutional",
        label:             "Constitutional Referendum",
        jurisdiction:      "referendum",
        eligibility:       "all-members",
        legitimacy:        "absolute-majority",
        thresholdFraction: 0.67,
        deliberationDays:  7,
        votingWindowDays:  14,
    },

    /**
     * General Referendum — standard membership vote.
     * Requires a majority of ALL members to approve. 3-day deliberation, 7-day window.
     * Use for: monetary parameters, major policy, anything requiring full legitimacy.
     */
    "referendum-general": {
        id:                "referendum-general",
        label:             "General Referendum",
        jurisdiction:      "referendum",
        eligibility:       "all-members",
        legitimacy:        "absolute-majority",
        thresholdFraction: 0.51,
        deliberationDays:  3,
        votingWindowDays:  7,
    },

    /**
     * Assembly Motion — standard deliberative body vote.
     * Majority of assembly members present. No deliberation period; 2-day window.
     * Use for: most contested community matters referred to the assembly.
     */
    "assembly-general": {
        id:                "assembly-general",
        label:             "Assembly Motion",
        jurisdiction:      "assembly",
        eligibility:       "assembly-members",
        legitimacy:        "majority-of-votes",
        thresholdFraction: 0.51,
        deliberationDays:  0,
        votingWindowDays:  2,
    },

    /**
     * Assembly Supermajority — elevated assembly vote.
     * 2/3 of assembly members must approve. No deliberation; 2-day window.
     * Use for: significant policy changes, referring matters to referendum.
     */
    "assembly-supermajority": {
        id:                "assembly-supermajority",
        label:             "Assembly Supermajority",
        jurisdiction:      "assembly",
        eligibility:       "assembly-members",
        legitimacy:        "majority-of-votes",
        thresholdFraction: 0.67,
        deliberationDays:  0,
        votingWindowDays:  2,
    },

    /**
     * Pool Vote — delegated operational vote.
     * Majority of pool members. No deliberation; 2-day window.
     * Use for: operational decisions within the pool's subject jurisdiction.
     */
    "pool-general": {
        id:                "pool-general",
        label:             "Pool Vote",
        jurisdiction:      "pool",
        eligibility:       "pool-members",
        legitimacy:        "majority-of-votes",
        thresholdFraction: 0.51,
        deliberationDays:  0,
        votingWindowDays:  2,
    },

    /**
     * Petition — accumulate approvals to a fixed count.
     * No reject side. No time-based deadline; resolves the moment the count is reached.
     * minApprovals is set at submission time, not here.
     * Use for: member admission, triggering a referendum, formal requests.
     */
    "petition": {
        id:               "petition",
        label:            "Petition",
        jurisdiction:     "referendum",
        eligibility:      "all-members",
        legitimacy:       "petition",
        deliberationDays: 0,
        votingWindowDays: 0,
    },
};

export type VoteRuleId = keyof typeof VOTE_RULES;

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Return a rule by ID. Throws if unknown. */
export function getVoteRule(id: string): VoteRule {
    const rule = VOTE_RULES[id];
    if (!rule) throw new Error(`Unknown vote rule: "${id}". Valid IDs: ${Object.keys(VOTE_RULES).join(", ")}`);
    return rule;
}

/** Return all built-in vote rules. */
export function listVoteRules(): VoteRule[] {
    return Object.values(VOTE_RULES);
}
