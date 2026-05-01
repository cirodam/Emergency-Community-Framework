import {
    AssemblyMotion,
    AssemblyMotionData,
    type MotionStage,
    type MotionOutcome,
    type VoteThresholdKey,
} from "@ecf/core";

// Re-export under the original names so existing consumers keep working.
export type FederationReferendumStage  = "draft" | "deliberating" | "voting" | "resolved";
export type FederationClerkStage       = "proposed" | "discussed" | "voted" | "resolved";
export type FederationMotionStage      = MotionStage;
export type FederationMotionOutcome    = MotionOutcome;
export type FederationVoteThresholdKey = VoteThresholdKey;

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * Which body owns this motion.
 * "referendum" — each member community votes asynchronously (1 community = 1 vote).
 * "assembly"   — seated assembly delegates deliberate; clerk records outcome.
 * any other string — the ID of a domain council.
 */
export type FederationMotionBody = "referendum" | "assembly" | string;

export interface FederationMotionComment {
    id:              string;
    communityHandle: string;
    authorHandle:    string;
    body:            string;
    createdAt:       string;
}

/**
 * In the federation, each member community casts one vote.
 * The voter is identified by their memberId (federation member record) and handle.
 */
export interface FederationMotionVote {
    communityMemberId: string;
    communityHandle:   string;
    vote:              "approve" | "reject" | "abstain";
    votedAt:           string;
}

export interface FederationMotionData extends AssemblyMotionData<FederationMotionVote, FederationMotionComment> {
    proposerMemberId: string;
}

// ── Class ─────────────────────────────────────────────────────────────────────

export class FederationMotion extends AssemblyMotion<FederationMotionVote, FederationMotionComment> {
    readonly proposerMemberId: string;

    constructor(opts: {
        body:             FederationMotionBody;
        title:            string;
        description:      string;
        proposerMemberId: string;
        proposerHandle:   string;
        parentId?:        string | null;
        kind?:            string | null;
        payload?:         string | null;
        id?:              string;
        createdAt?:       string;
    }) {
        super(opts);
        this.proposerMemberId = opts.proposerMemberId;
    }

    hasVoted(communityMemberId: string): boolean {
        return this.votes.some(v => v.communityMemberId === communityMemberId);
    }

    toData(): FederationMotionData {
        return { ...this.baseData(), proposerMemberId: this.proposerMemberId };
    }

    static fromData(d: FederationMotionData): FederationMotion {
        const m = new FederationMotion({
            id:               d.id,
            body:             d.body,
            title:            d.title,
            description:      d.description,
            proposerMemberId: d.proposerMemberId,
            proposerHandle:   d.proposerHandle,
            parentId:         d.parentId,
            kind:             d.kind,
            payload:          d.payload,
            createdAt:        d.createdAt,
        });
        m.restoreBase(d);
        return m;
    }
}

