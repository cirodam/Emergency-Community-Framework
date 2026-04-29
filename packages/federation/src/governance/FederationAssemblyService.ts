import { FederationAssemblyTerm } from "./FederationAssemblyTerm.js";
import type { FederationAssemblyTermLoader } from "./FederationAssemblyTermLoader.js";
import { FederationMemberService } from "../FederationMemberService.js";

export class FederationAssemblyService {
    private static instance: FederationAssemblyService;
    private loader!: FederationAssemblyTermLoader;
    private terms: FederationAssemblyTerm[] = [];

    private constructor() {}

    static getInstance(): FederationAssemblyService {
        if (!FederationAssemblyService.instance) {
            FederationAssemblyService.instance = new FederationAssemblyService();
        }
        return FederationAssemblyService.instance;
    }

    init(loader: FederationAssemblyTermLoader): void {
        this.loader = loader;
        this.terms  = loader.loadAll();
        console.log(`[FederationAssemblyService] loaded ${this.terms.length} term(s)`);
    }

    // ── Queries ───────────────────────────────────────────────────────────────

    getCurrentTerm(): FederationAssemblyTerm | null {
        return this.terms.find(t => t.endsAt === null) ?? this.terms[0] ?? null;
    }

    getTermById(id: string): FederationAssemblyTerm | undefined {
        return this.terms.find(t => t.id === id);
    }

    getAllTerms(): FederationAssemblyTerm[] { return [...this.terms]; }

    // ── Term management ───────────────────────────────────────────────────────

    /**
     * Start a new assembly term. Closes the current open term first.
     * Seats are populated with one vacant slot per member community.
     */
    startNewTerm(): FederationAssemblyTerm {
        const current = this.getCurrentTerm();
        if (current && current.endsAt === null) {
            current.endsAt = new Date().toISOString();
            this.loader.save(current);
        }

        const nextNumber = (current?.termNumber ?? 0) + 1;
        const members    = FederationMemberService.getInstance().getAll();

        const seats = members.map(m => ({
            communityMemberId: m.id,
            communityHandle:   m.handle,
            personHandle:      null,
            personName:        null,
            seatedAt:          null,
        }));

        const term = new FederationAssemblyTerm({ termNumber: nextNumber, seats });
        this.terms.unshift(term);
        this.loader.save(term);
        console.log(`[FederationAssemblyService] started term ${nextNumber} with ${seats.length} seat(s)`);
        return term;
    }

    /**
     * Seat a delegate from a member community.
     * Each community has exactly one seat; calling this again replaces the delegate.
     */
    seatDelegate(opts: {
        communityMemberId: string;
        communityHandle:   string;
        personHandle:      string;
        personName:        string;
    }): FederationAssemblyTerm {
        const term = this.currentOrThrow();

        let seat = term.getSeat(opts.communityMemberId);
        if (!seat) {
            // Add seat if community joined after this term started
            seat = {
                communityMemberId: opts.communityMemberId,
                communityHandle:   opts.communityHandle,
                personHandle:      null,
                personName:        null,
                seatedAt:          null,
            };
            term.seats.push(seat);
        }

        seat.personHandle = opts.personHandle;
        seat.personName   = opts.personName;
        seat.seatedAt     = new Date().toISOString();
        this.loader.save(term);
        return term;
    }

    /** Remove a delegate from their seat (vacate). */
    vacateSeat(communityMemberId: string): FederationAssemblyTerm {
        const term = this.currentOrThrow();
        const seat = term.getSeat(communityMemberId);
        if (!seat) throw new Error("No seat found for this community");

        seat.personHandle = null;
        seat.personName   = null;
        seat.seatedAt     = null;
        this.loader.save(term);
        return term;
    }

    /** Sync new member communities into the current term (add their vacant seats). */
    syncSeats(): void {
        const term = this.getCurrentTerm();
        if (!term) return;

        const members    = FederationMemberService.getInstance().getAll();
        let   changed    = false;

        for (const m of members) {
            if (!term.getSeat(m.id)) {
                term.seats.push({
                    communityMemberId: m.id,
                    communityHandle:   m.handle,
                    personHandle:      null,
                    personName:        null,
                    seatedAt:          null,
                });
                changed = true;
            }
        }

        if (changed) this.loader.save(term);
    }

    // ── Internal ──────────────────────────────────────────────────────────────

    private currentOrThrow(): FederationAssemblyTerm {
        const term = this.getCurrentTerm();
        if (!term) throw new Error("No assembly term is currently active");
        return term;
    }
}
