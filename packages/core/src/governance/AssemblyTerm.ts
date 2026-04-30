import { randomUUID } from "crypto";

// ── Seat interface ────────────────────────────────────────────────────────────

/**
 * Minimum shape every seat type must satisfy.
 * Subclasses extend this with their identity fields.
 */
export interface AssemblySeat {
    /** ISO 8601 — when this delegate was seated (null = vacant) */
    seatedAt: string | null;
}

// ── Data shape ────────────────────────────────────────────────────────────────

export interface AssemblyTermData<TSeat extends AssemblySeat> {
    id:         string;
    termNumber: number;
    startedAt:  string;
    endsAt:     string | null;
    seats:      TSeat[];
    motionIds:  string[];
}

// ── Base class ────────────────────────────────────────────────────────────────

/**
 * Abstract base for assembly terms at any governance level.
 *
 * Subclasses supply the concrete seat type `TSeat` and a key that identifies
 * a seat uniquely (e.g. `communityMemberId` at federation level).
 */
export abstract class AssemblyTerm<TSeat extends AssemblySeat> {
    readonly id:         string;
    readonly termNumber: number;
    readonly startedAt:  string;
    endsAt:   string | null;
    seats:    TSeat[];
    motionIds: string[];

    constructor(opts: {
        termNumber: number;
        id?:        string;
        startedAt?: string;
        endsAt?:    string | null;
        seats?:     TSeat[];
        motionIds?: string[];
    }) {
        this.id         = opts.id        ?? randomUUID();
        this.termNumber = opts.termNumber;
        this.startedAt  = opts.startedAt ?? new Date().toISOString();
        this.endsAt     = opts.endsAt    ?? null;
        this.seats      = opts.seats     ?? [];
        this.motionIds  = opts.motionIds ?? [];
    }

    get seatedDelegates(): TSeat[] {
        return this.seats.filter(s => s.seatedAt !== null);
    }

    get vacantSeats(): TSeat[] {
        return this.seats.filter(s => s.seatedAt === null);
    }

    protected baseData(): AssemblyTermData<TSeat> {
        return {
            id:         this.id,
            termNumber: this.termNumber,
            startedAt:  this.startedAt,
            endsAt:     this.endsAt,
            seats:      this.seats,
            motionIds:  this.motionIds,
        };
    }
}
