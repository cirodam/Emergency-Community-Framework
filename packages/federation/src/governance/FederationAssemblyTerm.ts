import { randomUUID } from "crypto";

/**
 * One community's seat in the federation assembly for a given term.
 * The community nominates a person (delegate) to represent them.
 * A seat without a delegate is vacant — the community has not yet nominated.
 */
export interface FederationAssemblySeat {
    communityMemberId: string;
    communityHandle:   string;
    /** The person serving as delegate; null = vacant */
    personHandle:      string | null;
    personName:        string | null;
    /** ISO 8601 — when this delegate was seated (null if vacant) */
    seatedAt:          string | null;
}

export interface FederationAssemblyTermData {
    id:          string;
    termNumber:  number;
    startedAt:   string;
    endsAt:      string | null;
    seats:       FederationAssemblySeat[];
    motionIds:   string[];
}

export class FederationAssemblyTerm {
    readonly id:         string;
    readonly termNumber: number;
    readonly startedAt:  string;
    endsAt:   string | null;
    seats:    FederationAssemblySeat[];
    /** Motion IDs brought before this assembly. */
    motionIds: string[];

    constructor(opts: {
        termNumber: number;
        id?:        string;
        startedAt?: string;
        endsAt?:    string | null;
        seats?:     FederationAssemblySeat[];
        motionIds?: string[];
    }) {
        this.id         = opts.id        ?? randomUUID();
        this.termNumber = opts.termNumber;
        this.startedAt  = opts.startedAt ?? new Date().toISOString();
        this.endsAt     = opts.endsAt    ?? null;
        this.seats      = opts.seats     ?? [];
        this.motionIds  = opts.motionIds ?? [];
    }

    getSeat(communityMemberId: string): FederationAssemblySeat | undefined {
        return this.seats.find(s => s.communityMemberId === communityMemberId);
    }

    get seatedDelegates(): FederationAssemblySeat[] {
        return this.seats.filter(s => s.personHandle !== null);
    }

    get vacantSeats(): FederationAssemblySeat[] {
        return this.seats.filter(s => s.personHandle === null);
    }

    toData(): FederationAssemblyTermData {
        return {
            id:         this.id,
            termNumber: this.termNumber,
            startedAt:  this.startedAt,
            endsAt:     this.endsAt,
            seats:      this.seats,
            motionIds:  this.motionIds,
        };
    }

    static fromData(d: FederationAssemblyTermData): FederationAssemblyTerm {
        return new FederationAssemblyTerm({
            id:         d.id,
            termNumber: d.termNumber,
            startedAt:  d.startedAt,
            endsAt:     d.endsAt,
            seats:      d.seats ?? [],
            motionIds:  d.motionIds ?? [],
        });
    }
}
