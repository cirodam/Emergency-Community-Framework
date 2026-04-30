import { randomUUID } from "crypto";

// ── Shared stage / outcome types ──────────────────────────────────────────────

export type ReferendumStage = "draft" | "deliberating" | "voting" | "resolved";
export type ClerkStage      = "proposed" | "discussed" | "voted" | "resolved";
export type MotionStage     = ReferendumStage | ClerkStage;

export type MotionOutcome = "passed" | "failed" | "withdrawn" | "referred";

export type VoteThresholdKey =
    | "thresholdSimpleMajority"
    | "thresholdSupermajority"
    | "thresholdNearConsensus";

// ── Serialisation shape (common fields) ───────────────────────────────────────

/**
 * The common data shape shared by every motion regardless of governing body or
 * vote/comment identity type.  Package-specific data types extend this with
 * their proposer identity field(s).
 */
export interface AssemblyMotionData<TVote, TComment> {
    id:                    string;
    body:                  string;
    stage:                 MotionStage;
    title:                 string;
    description:           string;
    proposerHandle:        string;
    createdAt:             string;
    deliberationStartedAt: string | null;
    votingOpensAt:         string | null;
    votingClosesAt:        string | null;
    thresholdKey:          VoteThresholdKey | null;
    votes:                 TVote[];
    comments:              TComment[];
    outcome:               MotionOutcome | null;
    outcomeNote:           string;
    resolvedAt:            string | null;
    referredToId:          string | null;
    parentId:              string | null;
    pendingAmendmentIds:   string[];
}

// ── Base class ────────────────────────────────────────────────────────────────

/**
 * Abstract base for all assembly/council motions.
 *
 * - `TVote`    must carry a `.vote: "approve" | "reject" | "abstain"` field.
 * - `TComment` is opaque to the base class.
 *
 * Subclasses add their proposer identity field(s), implement `hasVoted()`, and
 * provide `toData()` / static `fromData()` using `baseData()` / `restoreBase()`.
 */
export abstract class AssemblyMotion<
    TVote extends { vote: "approve" | "reject" | "abstain" },
    TComment,
> {
    readonly id:             string;
    readonly body:           string;
    readonly proposerHandle: string;
    readonly title:          string;
    readonly description:    string;
    readonly createdAt:      string;
    readonly parentId:       string | null;

    stage:                 MotionStage;
    deliberationStartedAt: string | null          = null;
    votingOpensAt:         string | null          = null;
    votingClosesAt:        string | null          = null;
    thresholdKey:          VoteThresholdKey | null = null;
    votes:                 TVote[]                = [];
    comments:              TComment[]             = [];
    outcome:               MotionOutcome | null   = null;
    outcomeNote:           string                 = "";
    resolvedAt:            string | null          = null;
    referredToId:          string | null          = null;
    pendingAmendmentIds:   string[]               = [];

    constructor(opts: {
        body:           string;
        title:          string;
        description:    string;
        proposerHandle: string;
        parentId?:      string | null;
        id?:            string;
        createdAt?:     string;
    }) {
        this.id             = opts.id             ?? randomUUID();
        this.body           = opts.body;
        this.title          = opts.title;
        this.description    = opts.description;
        this.proposerHandle = opts.proposerHandle;
        this.parentId       = opts.parentId       ?? null;
        this.createdAt      = opts.createdAt      ?? new Date().toISOString();
        // Clerk-driven bodies start at "proposed"; referendum starts at "draft".
        this.stage          = opts.body === "referendum" ? "draft" : "proposed";
    }

    // ── Computed ──────────────────────────────────────────────────────────────

    get isReferendum(): boolean { return this.body === "referendum"; }
    get isResolved(): boolean   { return this.stage === "resolved"; }

    get approvalCount(): number  { return this.votes.filter(v => v.vote === "approve").length; }
    get rejectionCount(): number { return this.votes.filter(v => v.vote === "reject").length; }

    // ── Serialisation helpers for subclasses ──────────────────────────────────

    protected baseData(): AssemblyMotionData<TVote, TComment> {
        return {
            id:                    this.id,
            body:                  this.body,
            stage:                 this.stage,
            title:                 this.title,
            description:           this.description,
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

    protected restoreBase(d: AssemblyMotionData<TVote, TComment>): void {
        this.stage                 = d.stage;
        this.deliberationStartedAt = d.deliberationStartedAt;
        this.votingOpensAt         = d.votingOpensAt;
        this.votingClosesAt        = d.votingClosesAt;
        this.thresholdKey          = d.thresholdKey;
        this.votes                 = d.votes;
        this.comments              = d.comments;
        this.outcome               = d.outcome;
        this.outcomeNote           = d.outcomeNote;
        this.resolvedAt            = d.resolvedAt;
        this.referredToId          = d.referredToId;
        this.pendingAmendmentIds   = d.pendingAmendmentIds;
    }
}
