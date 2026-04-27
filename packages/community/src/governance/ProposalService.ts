import { Proposal, ProposalType, ProposalStatus } from "./Proposal.js";
import { ProposalLoader } from "./ProposalLoader.js";
import { DomainService } from "../DomainService.js";
import { PersonService } from "../person/PersonService.js";
import { Constitution } from "./Constitution.js";
import { ConstitutionLoader } from "./ConstitutionLoader.js";

const DEFAULT_TTL_DAYS = 14;

export class ProposalService {
    private static instance: ProposalService;
    private loader!: ProposalLoader;
    private constitutionLoader!: ConstitutionLoader;
    private proposals = new Map<string, Proposal>();

    static getInstance(): ProposalService {
        if (!ProposalService.instance) ProposalService.instance = new ProposalService();
        return ProposalService.instance;
    }

    init(loader: ProposalLoader, constitutionLoader?: ConstitutionLoader): void {
        this.loader = loader;
        if (constitutionLoader) this.constitutionLoader = constitutionLoader;
        this.proposals = new Map(loader.loadAll().map(p => [p.id, p]));
        // Expire any open proposals that have passed their deadline
        for (const p of this.proposals.values()) {
            if (p.status === "open" && p.isExpired()) {
                p.status = "expired";
                this.loader.save(p);
            }
        }
    }

    // ── Queries ───────────────────────────────────────────────────────────────

    getAll(): Proposal[] { return Array.from(this.proposals.values()); }

    get(id: string): Proposal | undefined { return this.proposals.get(id); }

    getOpen(): Proposal[] {
        return this.getAll().filter(p => p.status === "open");
    }

    getByPool(poolId: string): Proposal[] {
        return this.getAll().filter(p => p.poolId === poolId);
    }

    getByProposer(personId: string): Proposal[] {
        return this.getAll().filter(p => p.proposerId === personId);
    }

    // ── Mutations ─────────────────────────────────────────────────────────────

    create(opts: {
        type:            ProposalType;
        poolId:          string;
        proposerId:      string;
        proposerHandle:  string;
        title:           string;
        description:     string;
        payload:         Record<string, unknown>;
        approvalsNeeded: number;
        ttlDays?:        number;
    }): Proposal {
        const pool = DomainService.getInstance().getPool(opts.poolId);
        if (!pool) throw new Error("Pool not found");
        if (!pool.hasPerson(opts.proposerId)) throw new Error("Only pool members can raise proposals");

        const proposal = new Proposal({
            ...opts,
            ttlDays: opts.ttlDays ?? DEFAULT_TTL_DAYS,
        });
        this.proposals.set(proposal.id, proposal);
        this.loader.save(proposal);
        return proposal;
    }

    castVote(
        proposalId: string,
        voterId:    string,
        voterHandle: string,
        vote:       "approve" | "reject" | "abstain",
        comment:    string = "",
    ): Proposal {
        const proposal = this.proposals.get(proposalId);
        if (!proposal)                   throw new Error("Proposal not found");
        if (proposal.status !== "open")  throw new Error("Proposal is no longer open");
        if (proposal.isExpired())        { this.expire(proposal); throw new Error("Proposal has expired"); }

        const pool = DomainService.getInstance().getPool(proposal.poolId);
        if (!pool?.hasPerson(voterId))   throw new Error("Only pool members can vote");
        if (proposal.hasVoted(voterId))  throw new Error("You have already voted on this proposal");

        proposal.votes.push({ personId: voterId, handle: voterHandle, vote, votedAt: new Date().toISOString(), comment });
        this.loader.save(proposal);

        // Check for auto-resolution
        this.checkResolution(proposal, pool.personIds.length);
        return proposal;
    }

    withdraw(proposalId: string, callerId: string): Proposal {
        const proposal = this.proposals.get(proposalId);
        if (!proposal)                         throw new Error("Proposal not found");
        if (proposal.proposerId !== callerId)   throw new Error("Only the proposer can withdraw");
        if (proposal.status !== "open")         throw new Error("Proposal is no longer open");
        proposal.status = "withdrawn";
        this.loader.save(proposal);
        return proposal;
    }

    // ── Internal ──────────────────────────────────────────────────────────────

    private expire(proposal: Proposal): void {
        proposal.status = "expired";
        this.loader.save(proposal);
    }

    private checkResolution(proposal: Proposal, poolSize: number): void {
        const approvals  = proposal.approvalCount;
        const rejections = proposal.rejectionCount;

        // Passed: enough approvals reached
        if (approvals >= proposal.approvalsNeeded) {
            proposal.status     = "passed";
            proposal.executedAt = new Date().toISOString();
            this.loader.save(proposal);
            this.execute(proposal);
            return;
        }

        // Rejected early: strict majority of pool voted reject
        const rejectThreshold = Math.floor(poolSize / 2) + 1;
        if (rejections >= rejectThreshold) {
            proposal.status = "rejected";
            this.loader.save(proposal);
        }
    }

    /**
     * Apply the side-effect of a passed proposal.
     * Auto-executes: suspend-member, reinstate-member, constitution-amendment.
     * Other types record the decision in the audit trail for human follow-through.
     */
    private execute(proposal: Proposal): void {
        try {
            const personSvc = PersonService.getInstance();

            if (proposal.type === "suspend-member") {
                const personId = proposal.payload.personId as string | undefined;
                if (personId && personSvc.get(personId)) {
                    personSvc.update(personId, { disabled: true });
                    proposal.outcomeNote = `Member suspended automatically.`;
                }

            } else if (proposal.type === "reinstate-member") {
                const personId = proposal.payload.personId as string | undefined;
                if (personId && personSvc.get(personId)) {
                    personSvc.update(personId, { disabled: false });
                    proposal.outcomeNote = `Member reinstated automatically.`;
                }

            } else if (proposal.type === "constitution-amendment") {
                const parameter = proposal.payload.parameter as string | undefined;
                const newValue  = proposal.payload.newValue  as number | boolean | undefined;
                if (parameter === undefined || newValue === undefined) {
                    throw new Error("constitution-amendment payload must include 'parameter' and 'newValue'");
                }
                const constitution = Constitution.getInstance();
                const oldValue = constitution.getAll()[parameter]?.value;
                constitution.amend(parameter, newValue, proposal.id);
                if (this.constitutionLoader) this.constitutionLoader.save();
                proposal.outcomeNote =
                    `Constitution amended: "${parameter}" changed from ${oldValue} to ${newValue} (v${constitution.toDocument().version}).`;

            } else {
                // add-member, change-role, budget-change, pool-change, other
                proposal.outcomeNote = "Proposal passed — requires human follow-through.";
            }
        } catch (err) {
            proposal.outcomeNote = `Execution error: ${(err as Error).message}`;
        }
        this.loader.save(proposal);
    }
}
