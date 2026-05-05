import {
    AssemblyMotion,
    AssemblyMotionData,
    type ClerkStage,
    type ReferendumStage,
    type MotionStage,
    type MotionOutcome,
} from "@ecf/core";

// Re-export shared types so existing consumers of this module keep working.
export type { ClerkStage, ReferendumStage, MotionStage, MotionOutcome };

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * Which body owns this motion.
 * "referendum" — full membership votes asynchronously online.
 * "assembly"   — seated assembly deliberates in person; clerk records outcome.
 * any other string — the ID of a leader pool meeting in person.
 */
export type MotionBody = "referendum" | "assembly" | string;

export type CommentKind = "evidence" | "challenge" | "general";

export interface MotionComment {
    id:           string;
    authorId:     string;
    authorHandle: string;
    body:         string;
    kind:         CommentKind;
    createdAt:    string; // ISO 8601
}

export interface MotionVote {
    personId: string;
    handle:   string;
    vote:     "approve" | "reject" | "abstain";
    votedAt:  string;
}

export interface MotionData extends AssemblyMotionData<MotionVote, MotionComment> {
    proposerId: string;
}

// ── Class ─────────────────────────────────────────────────────────────────────

export class Motion extends AssemblyMotion<MotionVote, MotionComment> {
    readonly proposerId: string;

    constructor(opts: {
        body:            MotionBody;
        title:           string;
        description:     string;
        proposerId:      string;
        proposerHandle:  string;
        parentId?:       string | null;
        kind?:           string | null;
        payload?:        string | null;
        premises?:       string | null;
        expectedOutcome?: string | null;
        id?:             string;
        createdAt?:      string;
    }) {
        super(opts);
        this.proposerId      = opts.proposerId;
        this.premises        = opts.premises        ?? null;
        this.expectedOutcome = opts.expectedOutcome ?? null;
    }

    hasVoted(personId: string): boolean {
        return this.votes.some(v => v.personId === personId);
    }

    toData(): MotionData {
        return { ...this.baseData(), proposerId: this.proposerId };
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
            kind:           d.kind,
            payload:        d.payload,
            createdAt:      d.createdAt,
        });
        m.restoreBase(d);
        return m;
    }
}

