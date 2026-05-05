import { randomUUID } from "crypto";
import { Motion, type MotionOutcome, type CommentKind } from "./Motion.js";
import { MotionLoader } from "./MotionLoader.js";
import { PersonService } from "../person/PersonService.js";
import { effectRegistry } from "./EffectRegistry.js";
import { CommunityLogService } from "../log/CommunityLogService.js";
import { getVoteRule } from "@ecf/core";

/** Fallback voting window when no vote rule is present. */
const DEFAULT_VOTING_DAYS = 7;

export class MotionService {
    private static instance: MotionService;
    private loader!: MotionLoader;
    private motions = new Map<string, Motion>();

    static getInstance(): MotionService {
        if (!MotionService.instance) MotionService.instance = new MotionService();
        return MotionService.instance;
    }

    init(loader: MotionLoader): void {
        this.loader = loader;
        this.motions = new Map(loader.loadAll().map(m => [m.id, m]));
        // Advance any expired voting-stage referenda
        for (const m of this.motions.values()) {
            if (m.isReferendum && m.stage === "voting" && m.votingClosesAt) {
                if (new Date() > new Date(m.votingClosesAt)) {
                    this.resolveByDeadline(m);
                }
            }
        }
    }

    // ── Queries ───────────────────────────────────────────────────────────────

    getAll(): Motion[] { return Array.from(this.motions.values()); }

    get(id: string): Motion | undefined { return this.motions.get(id); }

    getByBody(body: string): Motion[] {
        return this.getAll().filter(m => m.body === body);
    }

    getByProposer(personId: string): Motion[] {
        return this.getAll().filter(m => m.proposerId === personId);
    }

    // ── Referendum lifecycle ──────────────────────────────────────────────────

    /**
     * Create a new motion.
     * - referendum: starts in "draft"
     * - assembly/pool: starts in "proposed"
     */
    create(opts: {
        body:            string;
        title:           string;
        description:     string;
        proposerId:      string;
        proposerHandle:  string;
        parentId?:       string;
        kind?:           string | null;
        payload?:        string | null;
        premises?:       string | null;
        expectedOutcome?: string | null;
    }): Motion {
        const motion = new Motion(opts);
        this.motions.set(motion.id, motion);
        this.loader.save(motion);
        return motion;
    }

    /**
     * Submit a referendum draft for deliberation.
     * The vote rule governs eligibility, legitimacy standard, deliberation period, and voting window.
     */
    submitForDeliberation(
        motionId:     string,
        callerId:     string,
        voteRuleId:   string = "referendum-general",
        minApprovals?: number,
    ): Motion {
        const m = this.require(motionId);
        if (!m.isReferendum)           throw new Error("Only referendum motions use deliberation");
        if (m.stage !== "draft")        throw new Error("Motion is not a draft");
        if (m.proposerId !== callerId)  throw new Error("Only the proposer can submit for deliberation");

        const rule = getVoteRule(voteRuleId);

        if (rule.legitimacy === "petition") {
            if (!minApprovals || minApprovals < 1)
                throw new Error("minApprovals must be at least 1 for a petition");
            m.minApprovals = minApprovals;
        }

        const now = new Date();
        m.voteRuleId            = voteRuleId;
        m.stage                 = "deliberating";
        m.deliberationStartedAt = now.toISOString();

        if (rule.deliberationDays > 0) {
            const votingOpens = new Date(now);
            votingOpens.setDate(votingOpens.getDate() + rule.deliberationDays);
            m.votingOpensAt = votingOpens.toISOString();
        } else {
            m.votingOpensAt = now.toISOString(); // no deliberation period; ready immediately
        }

        this.loader.save(m);
        return m;
    }

    /**
     * Open voting on a deliberating referendum motion.
     * Can only be called after the deliberation period has elapsed.
     */
    openVoting(motionId: string, callerId: string): Motion {
        const m = this.require(motionId);
        if (!m.isReferendum)           throw new Error("Only referendum motions use this transition");
        if (m.stage !== "deliberating") throw new Error("Motion is not in deliberation");
        if (m.pendingAmendmentIds.length > 0) throw new Error("Pending amendments must resolve first");
        if (m.votingOpensAt && new Date() < new Date(m.votingOpensAt)) {
            throw new Error("Deliberation period has not elapsed yet");
        }

        const rule = m.voteRuleId ? getVoteRule(m.voteRuleId) : null;
        const windowDays = rule?.votingWindowDays ?? DEFAULT_VOTING_DAYS;

        m.stage = "voting";
        if (windowDays > 0) {
            const closes = new Date();
            closes.setDate(closes.getDate() + windowDays);
            m.votingClosesAt = closes.toISOString();
        }
        // petition (windowDays === 0): no deadline; closes on threshold hit
        this.loader.save(m);
        return m;
    }

    /** Cast a vote on a referendum motion. */
    castVote(
        motionId: string,
        voterId:  string,
        voterHandle: string,
        vote:     "approve" | "reject" | "abstain",
    ): Motion {
        const m = this.require(motionId);
        if (!m.isReferendum)      throw new Error("Use clerk actions for assembly/pool motions");
        if (m.stage !== "voting") throw new Error("Motion is not in voting stage");
        if (m.votingClosesAt && new Date() > new Date(m.votingClosesAt)) {
            this.resolveByDeadline(m);
            throw new Error("Voting period has closed");
        }
        if (m.hasVoted(voterId)) throw new Error("You have already voted on this motion");

        m.votes.push({ personId: voterId, handle: voterHandle, vote, votedAt: new Date().toISOString() });
        this.loader.save(m);

        // Check early resolution by threshold
        this.checkReferendumResolution(m);
        return m;
    }

    /** Add a comment during deliberation or voting. */
    addComment(motionId: string, authorId: string, authorHandle: string, body: string, kind: CommentKind = "general"): Motion {
        const m = this.require(motionId);
        if (m.stage === "draft" || m.stage === "resolved") {
            throw new Error("Comments can only be added during deliberation or voting");
        }
        m.comments.push({
            id:           randomUUID(),
            authorId,
            authorHandle,
            body:         body.trim(),
            kind,
            createdAt:    new Date().toISOString(),
        });
        this.loader.save(m);
        return m;
    }

    /** Record a dissent statement on a resolved passed motion. */
    recordDissent(motionId: string, authorHandle: string, body: string): Motion {
        const m = this.require(motionId);
        if (m.stage !== "resolved") throw new Error("Dissents can only be recorded on resolved motions");
        if (m.outcome !== "passed") throw new Error("Dissents are only recorded on passed motions");
        m.dissents.push({ authorHandle, body: body.trim(), recordedAt: new Date().toISOString() });
        this.loader.save(m);
        return m;
    }

    // ── Clerk lifecycle (assembly / pool) ─────────────────────────────────────

    /** Mark a proposed docket item as discussed. Steward-only. */
    markDiscussed(motionId: string): Motion {
        const m = this.require(motionId);
        if (m.isReferendum)         throw new Error("Use referendum lifecycle for referendum motions");
        if (m.stage !== "proposed") throw new Error("Motion must be in 'proposed' stage");
        m.stage = "discussed";
        this.loader.save(m);
        return m;
    }

    /** Record the in-room vote outcome. Steward-only. */
    recordOutcome(
        motionId:   string,
        outcome:    MotionOutcome,
        outcomeNote = "",
    ): Motion {
        const m = this.require(motionId);
        if (m.isReferendum) throw new Error("Use referendum lifecycle for referendum motions");
        if (m.stage === "resolved") throw new Error("Motion already resolved");

        m.stage       = outcome === "referred" ? "resolved" : "voted";
        m.outcome     = outcome;
        m.outcomeNote = outcomeNote;

        if (outcome !== "referred") {
            m.stage     = "resolved";
            m.resolvedAt = new Date().toISOString();
        }

        if (outcome === "passed") effectRegistry.dispatch(m);
        this.loader.save(m);
        try {
            const logSvc = CommunityLogService.getInstance();
            if (outcome === "passed")    logSvc.write("motion-passed",    `Motion passed: ${m.title}`, { refId: m.id });
            else if (outcome === "failed") logSvc.write("motion-failed",  `Motion failed: ${m.title}`, { refId: m.id });
        } catch { /* log service may not be initialised in tests */ }
        return m;
    }

    // ── Shared actions ────────────────────────────────────────────────────────

    /** Withdraw a motion before it resolves. Only the proposer. */
    withdraw(motionId: string, callerId: string): Motion {
        const m = this.require(motionId);
        if (m.proposerId !== callerId) throw new Error("Only the proposer can withdraw");
        if (m.isResolved)              throw new Error("Motion already resolved");
        m.stage      = "resolved";
        m.outcome    = "withdrawn";
        m.resolvedAt = new Date().toISOString();
        this.loader.save(m);
        return m;
    }

    // ── Internal ──────────────────────────────────────────────────────────────

    private require(id: string): Motion {
        const m = this.motions.get(id);
        if (!m) throw new Error(`Motion "${id}" not found`);
        return m;
    }

    private resolveByDeadline(m: Motion): void {
        const rule       = m.voteRuleId ? getVoteRule(m.voteRuleId) : null;
        const legitimacy = rule?.legitimacy ?? "absolute-majority";
        const needed     = this.getNeededApprovals(m);
        const eligible   = PersonService.getInstance().getAll().filter(p => !p.disabled).length;

        m.outcome    = m.approvalCount >= needed ? "passed" : "failed";
        m.stage      = "resolved";
        m.resolvedAt = new Date().toISOString();

        if (legitimacy === "petition") {
            m.outcomeNote = `Resolved at deadline. ${m.approvalCount}/${needed} approvals received.`;
        } else {
            m.outcomeNote = `Resolved at deadline. ${m.approvalCount}/${eligible} approved (needed ${needed}).`;
        }

        if (m.outcome === "passed") effectRegistry.dispatch(m);
        this.loader.save(m);
        try {
            const logSvc = CommunityLogService.getInstance();
            if (m.outcome === "passed") logSvc.write("motion-passed", `Motion passed: ${m.title}`, { refId: m.id });
            else                        logSvc.write("motion-failed", `Motion failed: ${m.title}`, { refId: m.id });
        } catch { /* log service may not be initialised in tests */ }
    }

    private checkReferendumResolution(m: Motion): void {
        const rule       = m.voteRuleId ? getVoteRule(m.voteRuleId) : null;
        const legitimacy = rule?.legitimacy ?? "absolute-majority";
        const needed     = this.getNeededApprovals(m);
        const eligible   = PersonService.getInstance().getAll().filter(p => !p.disabled).length;

        // Early pass
        if (m.approvalCount >= needed) {
            m.outcome    = "passed";
            m.stage      = "resolved";
            m.resolvedAt = new Date().toISOString();
            if (legitimacy === "petition") {
                m.outcomeNote = `Petition passed with ${m.approvalCount} approval${m.approvalCount !== 1 ? "s" : ""}.`;
            } else {
                m.outcomeNote = `Passed with ${m.approvalCount}/${eligible} approvals (needed ${needed}).`;
            }
            effectRegistry.dispatch(m);
            this.loader.save(m);
            try { CommunityLogService.getInstance().write("motion-passed", `Motion passed: ${m.title}`, { refId: m.id }); } catch { /* */ }
            return;
        }

        // Early rejection for absolute-majority: mathematically impossible to reach threshold
        if (legitimacy === "absolute-majority") {
            const remaining = eligible - m.votes.length;
            if (m.approvalCount + remaining < needed) {
                m.outcome    = "failed";
                m.stage      = "resolved";
                m.resolvedAt = new Date().toISOString();
                m.outcomeNote = `Failed: cannot reach ${needed}/${eligible} approvals needed. ${m.approvalCount} approvals, ${remaining} votes remaining.`;
                this.loader.save(m);
                try { CommunityLogService.getInstance().write("motion-failed", `Motion failed: ${m.title}`, { refId: m.id }); } catch { /* */ }
            }
        }
    }

    private getNeededApprovals(m: Motion): number {
        const eligible = PersonService.getInstance().getAll().filter(p => !p.disabled).length;
        const rule = getVoteRule(m.voteRuleId ?? "referendum-general");
        if (rule.legitimacy === "petition") return m.minApprovals ?? 1;
        return Math.ceil(eligible * (rule.thresholdFraction ?? 0.51));
    }
}
