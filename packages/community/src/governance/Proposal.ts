import { randomUUID } from "crypto";

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * What kind of change the proposal represents.
 * The `payload` shape varies by type — see ProposalPayload below.
 */
export type ProposalType =
    | "add-member"
    | "suspend-member"
    | "reinstate-member"
    | "change-role"
    | "budget-change"
    | "pool-change"
    | "constitution-amendment"
    | "other";

export type ProposalStatus = "open" | "passed" | "rejected" | "expired" | "withdrawn";

export interface ProposalVote {
    personId:  string;
    handle:    string;
    vote:      "approve" | "reject" | "abstain";
    votedAt:   string; // ISO 8601
    comment:   string;
}

/**
 * A Proposal represents a request for collective action.
 *
 * Voting is restricted to members of the designated pool. A proposal passes
 * when `approvalsNeeded` unique approvals are recorded before `expiresAt`.
 * It is rejected early if more than half the pool votes reject.
 *
 * On pass, the `executedAt` timestamp is set. The actual side-effect
 * (e.g. disabling a member) is performed by ProposalService after passing.
 */
export const PROPOSAL_TYPES: ProposalType[] = [
    "add-member",
    "suspend-member",
    "reinstate-member",
    "change-role",
    "budget-change",
    "pool-change",
    "constitution-amendment",
    "other",
];

export class Proposal {
    readonly id:          string;
    readonly type:        ProposalType;
    readonly poolId:      string;   // which LeaderPool votes on this
    readonly proposerId:  string;
    readonly proposerHandle: string;
    readonly title:       string;
    readonly description: string;
    readonly payload:     Record<string, unknown>; // type-specific data
    readonly approvalsNeeded: number;
    readonly createdAt:   string;
    readonly expiresAt:   string;

    status:      ProposalStatus = "open";
    votes:       ProposalVote[] = [];
    executedAt:  string | null  = null;
    outcomeNote: string         = "";

    constructor(opts: {
        type:            ProposalType;
        poolId:          string;
        proposerId:      string;
        proposerHandle:  string;
        title:           string;
        description:     string;
        payload:         Record<string, unknown>;
        approvalsNeeded: number;
        ttlDays:         number;
        id?:             string;
        createdAt?:      string;
    }) {
        this.id              = opts.id      ?? randomUUID();
        this.type            = opts.type;
        this.poolId          = opts.poolId;
        this.proposerId      = opts.proposerId;
        this.proposerHandle  = opts.proposerHandle;
        this.title           = opts.title;
        this.description     = opts.description;
        this.payload         = opts.payload;
        this.approvalsNeeded = opts.approvalsNeeded;
        this.createdAt       = opts.createdAt ?? new Date().toISOString();
        const exp            = new Date(this.createdAt);
        exp.setDate(exp.getDate() + opts.ttlDays);
        this.expiresAt       = exp.toISOString();
    }

    // ── Computed helpers ──────────────────────────────────────────────────────

    get approvalCount(): number {
        return this.votes.filter(v => v.vote === "approve").length;
    }

    get rejectionCount(): number {
        return this.votes.filter(v => v.vote === "reject").length;
    }

    hasVoted(personId: string): boolean {
        return this.votes.some(v => v.personId === personId);
    }

    isExpired(): boolean {
        return new Date() > new Date(this.expiresAt);
    }
}
