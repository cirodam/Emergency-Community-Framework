import { randomUUID } from "crypto";

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * Which body owns this motion.
 * "referendum" — each member community votes asynchronously (1 community = 1 vote).
 * "assembly"   — seated assembly delegates deliberate; clerk records outcome.
 * any other string — the ID of a domain council.
 */
export type FederationMotionBody = "referendum" | "assembly" | string;

export type FederationReferendumStage = "draft" | "deliberating" | "voting" | "resolved";
export type FederationClerkStage      = "proposed" | "discussed" | "voted" | "resolved";
export type FederationMotionStage     = FederationReferendumStage | FederationClerkStage;

export type FederationMotionOutcome = "passed" | "failed" | "withdrawn" | "referred";

export type FederationVoteThresholdKey =
    | "thresholdSimpleMajority"
    | "thresholdSupermajority"
    | "thresholdNearConsensus";

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

export interface FederationMotionData {
    id:                    string;
    body:                  FederationMotionBody;
    stage:                 FederationMotionStage;
    title:                 string;
    description:           string;
    proposerMemberId:      string;
    proposerHandle:        string;
    createdAt:             string;
    deliberationStartedAt: string | null;
    votingOpensAt:         string | null;
    votingClosesAt:        string | null;
    thresholdKey:          FederationVoteThresholdKey | null;
    votes:                 FederationMotionVote[];
    comments:              FederationMotionComment[];
    outcome:               FederationMotionOutcome | null;
    outcomeNote:           string;
    resolvedAt:            string | null;
    referredToId:          string | null;
    parentId:              string | null;
    pendingAmendmentIds:   string[];
}

// ── Class ─────────────────────────────────────────────────────────────────────

export class FederationMotion {
    readonly id:               string;
    readonly body:             FederationMotionBody;
    readonly proposerMemberId: string;
    readonly proposerHandle:   string;
    readonly title:            string;
    readonly description:      string;
    readonly createdAt:        string;
    readonly parentId:         string | null;

    stage:                 FederationMotionStage;
    deliberationStartedAt: string | null          = null;
    votingOpensAt:         string | null          = null;
    votingClosesAt:        string | null          = null;
    thresholdKey:          FederationVoteThresholdKey | null = null;
    votes:                 FederationMotionVote[] = [];
    comments:              FederationMotionComment[] = [];
    outcome:               FederationMotionOutcome | null = null;
    outcomeNote:           string                 = "";
    resolvedAt:            string | null          = null;
    referredToId:          string | null          = null;
    pendingAmendmentIds:   string[]               = [];

    constructor(opts: {
        body:             FederationMotionBody;
        title:            string;
        description:      string;
        proposerMemberId: string;
        proposerHandle:   string;
        parentId?:        string | null;
        id?:              string;
        createdAt?:       string;
    }) {
        this.id               = opts.id       ?? randomUUID();
        this.body             = opts.body;
        this.title            = opts.title;
        this.description      = opts.description;
        this.proposerMemberId = opts.proposerMemberId;
        this.proposerHandle   = opts.proposerHandle;
        this.parentId         = opts.parentId ?? null;
        this.createdAt        = opts.createdAt ?? new Date().toISOString();
        this.stage            = opts.body === "referendum" ? "draft" : "proposed";
    }

    get isReferendum(): boolean { return this.body === "referendum"; }
    get isResolved(): boolean   { return this.stage === "resolved"; }

    get approvalCount(): number {
        return this.votes.filter(v => v.vote === "approve").length;
    }

    get rejectionCount(): number {
        return this.votes.filter(v => v.vote === "reject").length;
    }

    hasVoted(communityMemberId: string): boolean {
        return this.votes.some(v => v.communityMemberId === communityMemberId);
    }

    toData(): FederationMotionData {
        return {
            id:                    this.id,
            body:                  this.body,
            stage:                 this.stage,
            title:                 this.title,
            description:           this.description,
            proposerMemberId:      this.proposerMemberId,
            proposerHandle:        this.proposerHandle,
            createdAt:             this.createdAt,
            deliberationStartedAt: this.deliberationStartedAt,
            votingOpensAt:         this.votingOpensAt,
            votingClosesAt:        this.votingClosesAt,
            thresholdKey:          this.thresholdKey,
            votes:                 this.votes,
            comments:              this.comments,
            outcome:               this.outcome,
            outcomeNote:           this.outcomeNote,
            resolvedAt:            this.resolvedAt,
            referredToId:          this.referredToId,
            parentId:              this.parentId,
            pendingAmendmentIds:   this.pendingAmendmentIds,
        };
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
            createdAt:        d.createdAt,
        });
        m.stage                 = d.stage;
        m.deliberationStartedAt = d.deliberationStartedAt;
        m.votingOpensAt         = d.votingOpensAt;
        m.votingClosesAt        = d.votingClosesAt;
        m.thresholdKey          = d.thresholdKey;
        m.votes                 = d.votes;
        m.comments              = d.comments;
        m.outcome               = d.outcome;
        m.outcomeNote           = d.outcomeNote;
        m.resolvedAt            = d.resolvedAt;
        m.referredToId          = d.referredToId;
        m.pendingAmendmentIds   = d.pendingAmendmentIds;
        return m;
    }
}
