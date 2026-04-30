import { AssemblyTerm, AssemblyTermData, type AssemblySeat } from "@ecf/core";

/**
 * One community's seat in the federation assembly for a given term.
 * The community nominates a person (delegate) to represent them.
 * A seat without a delegate is vacant — the community has not yet nominated.
 */
export interface FederationAssemblySeat extends AssemblySeat {
    communityMemberId: string;
    communityHandle:   string;
    /** The person serving as delegate; null = vacant */
    personHandle:      string | null;
    personName:        string | null;
    /** ISO 8601 — when this delegate was seated (null if vacant) */
    seatedAt:          string | null;
}

export interface FederationAssemblyTermData extends AssemblyTermData<FederationAssemblySeat> {}

export class FederationAssemblyTerm extends AssemblyTerm<FederationAssemblySeat> {
    getSeat(communityMemberId: string): FederationAssemblySeat | undefined {
        return this.seats.find(s => s.communityMemberId === communityMemberId);
    }

    toData(): FederationAssemblyTermData {
        return this.baseData();
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

