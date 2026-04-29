import { randomUUID } from "crypto";

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * Which body owns this motion.
 * "referendum" — full membership votes asynchronously online.
 * "assembly"   — seated assembly deliberates in person; clerk records outcome.
 * any other string — the ID of a leader pool meeting in person.
 */
export type MotionBody = "referendum" | "assembly" | string;

/**
 * Referendum motions are fully software-driven.
 * Assembly/pool motions are clerk-driven; the software is the record-keeper.
 */
export type ReferendumStage = "draft" | "deliberating" | "voting" | "resolved";
export type ClerkStage      = "proposed" | "discussed" | "voted" | "resolved";
export type MotionStage     = ReferendumStage | ClerkStage;

export type MotionOutcome = "passed" | "failed" | "withdrawn" | "referred";

/** Vote threshold that must be met for a referendum motion to pass. */
export type VoteThresholdKey = "thresholdSimpleMajority" | "thresholdSupermajority" | "thresholdNearConsensus";

export interface MotionComment {
    id:        string;
    authorId:  string;
    authorHandle: string;
    body:      string;
    createdAt: string; // ISO 8601
}

export interface MotionVote {
    personId:     string;
    handle:       string;
    vote:         "approve" | "reject" | "abstain";
    votedAt:      string;
}

export interface MotionData {
    id:              string;
    body:            MotionBody;
    stage:           MotionStage;
    title:           string;
    description:     string;
    proposerId:      string;
    proposerHandle:  string;
    createdAt:       string;
    /** ISO 8601 — when deliberation started (referendum only). */
    deliberationStartedAt: string | null;
    /** ISO 8601 — earliest time voting may open (referendum only). */
    votingOpensAt:   string | null;
    /** ISO 8601 — voting deadline (referendum only). */
    votingClosesAt:  string | null;
    /** Which constitutional threshold applies (referendum only). */
    thresholdKey:    VoteThresholdKey | null;
    votes:           MotionVote[];
    comments:        MotionComment[];
    outcome:         MotionOutcome | null;
    outcomeNote:     string;
    resolvedAt:      string | null;
    /** For referred motions: the ID of the motion this was referred to. */
    referredToId:    string | null;
    /** For amendment motions: the ID of the parent motion being amended. */
    parentId:        string | null;
    /** Ordered list of child amendment motion IDs pending before this can vote. */
    pendingAmendmentIds: string[];
}

// ── Class ─────────────────────────────────────────────────────────────────────

export class Motion {
    readonly id:             string;
    readonly body:           MotionBody;
    readonly proposerId:     string;
    readonly proposerHandle: string;
    readonly title:          string;
    readonly description:    string;
    readonly createdAt:      string;
    readonly parentId:       string | null;

    stage:                MotionStage;
    deliberationStartedAt: string | null  = null;
    votingOpensAt:        string | null   = null;
    votingClosesAt:       string | null   = null;
    thresholdKey:         VoteThresholdKey | null = null;
    votes:                MotionVote[]    = [];
    comments:             MotionComment[] = [];
    outcome:              MotionOutcome | null = null;
    outcomeNote:          string          = "";
    resolvedAt:           string | null   = null;
    referredToId:         string | null   = null;
    pendingAmendmentIds:  string[]        = [];

    constructor(opts: {
        body:           MotionBody;
        title:          string;
        description:    string;
        proposerId:     string;
        proposerHandle: string;
        parentId?:      string | null;
        id?:            string;
        createdAt?:     string;
    }) {
        this.id             = opts.id       ?? randomUUID();
        this.body           = opts.body;
        this.title          = opts.title;
        this.description    = opts.description;
        this.proposerId     = opts.proposerId;
        this.proposerHandle = opts.proposerHandle;
        this.parentId       = opts.parentId ?? null;
        this.createdAt      = opts.createdAt ?? new Date().toISOString();
        // Initial stage depends on body type
        this.stage = opts.body === "referendum" ? "draft" : "proposed";
    }

    // ── Computed ──────────────────────────────────────────────────────────────

    get isReferendum(): boolean { return this.body === "referendum"; }

    get isResolved(): boolean { return this.stage === "resolved"; }

    get approvalCount(): number {
        return this.votes.filter(v => v.vote === "approve").length;
    }

    get rejectionCount(): number {
        return this.votes.filter(v => v.vote === "reject").length;
    }

    hasVoted(personId: string): boolean {
        return this.votes.some(v => v.personId === personId);
    }

    // ── Serialise ─────────────────────────────────────────────────────────────

    toData(): MotionData {
        return {
            id:                   this.id,
            body:                 this.body,
            stage:                this.stage,
            title:                this.title,
            description:          this.description,
            proposerId:           this.proposerId,
            proposerHandle:       this.proposerHandle,
            createdAt:            this.createdAt,
            deliberationStartedAt: this.deliberationStartedAt,
            votingOpensAt:        this.votingOpensAt,
            votingClosesAt:       this.votingClosesAt,
            thresholdKey:         this.thresholdKey,
            votes:                this.votes,
            comments:             this.comments,
            outcome:              this.outcome,
            outcomeNote:          this.outcomeNote,
            resolvedAt:           this.resolvedAt,
            referredToId:         this.referredToId,
            parentId:             this.parentId,
            pendingAmendmentIds:  this.pendingAmendmentIds,
        };
    }

    static fromData(d: MotionData): Motion {
        const m = new Motion({
            id:             d.id,
            body:           d.body,
            title:          d.title,
            description:    d.description,
            proposerId:     d.proposerId,
            proposerHandle: d.proposerHandle,
            parentId:       d.parentId,
            createdAt:      d.createdAt,
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
