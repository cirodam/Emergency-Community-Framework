import { randomUUID } from "crypto";
import { Motion, type MotionOutcome, type VoteThresholdKey } from "./Motion.js";
import { MotionLoader } from "./MotionLoader.js";
import { Constitution } from "./Constitution.js";
import { PersonService } from "../person/PersonService.js";
import { effectRegistry } from "./EffectRegistry.js";

/** How long a referendum motion sits in deliberation before voting may open. */
const DEFAULT_DELIBERATION_DAYS = 3;
/** How long a referendum vote stays open. */
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
        body:           string;
        title:          string;
        description:    string;
        proposerId:     string;
        proposerHandle: string;
        parentId?:      string;
        kind?:          string | null;
        payload?:       string | null;
    }): Motion {
        const motion = new Motion(opts);
        this.motions.set(motion.id, motion);
        this.loader.save(motion);
        return motion;
    }

    /**
     * Submit a referendum draft for deliberation.
     * Sets the minimum deliberation period before voting can open.
     */
    submitForDeliberation(
        motionId:    string,
        callerId:    string,
        thresholdKey: VoteThresholdKey = "thresholdSimpleMajority",
    ): Motion {
        const m = this.require(motionId);
        if (!m.isReferendum)    throw new Error("Only referendum motions use deliberation");
        if (m.stage !== "draft") throw new Error("Motion is not a draft");
        if (m.proposerId !== callerId) throw new Error("Only the proposer can submit for deliberation");

        const constitution = Constitution.getInstance();
        const delayDays = constitution.deliberationPeriodDays ?? DEFAULT_DELIBERATION_DAYS;

        const now = new Date();
        const votingOpens = new Date(now);
        votingOpens.setDate(votingOpens.getDate() + delayDays);

        m.stage                 = "deliberating";
        m.deliberationStartedAt = now.toISOString();
        m.votingOpensAt         = votingOpens.toISOString();
        m.thresholdKey          = thresholdKey;
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

        const closes = new Date();
        closes.setDate(closes.getDate() + DEFAULT_VOTING_DAYS);

        m.stage          = "voting";
        m.votingClosesAt = closes.toISOString();
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
    addComment(motionId: string, authorId: string, authorHandle: string, body: string): Motion {
        const m = this.require(motionId);
        if (m.stage === "draft" || m.stage === "resolved") {
            throw new Error("Comments can only be added during deliberation or voting");
        }
        m.comments.push({
            id:           randomUUID(),
            authorId,
            authorHandle,
            body:         body.trim(),
            createdAt:    new Date().toISOString(),
        });
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
        const totalMembers = PersonService.getInstance().getAll().length;
        const threshold = this.getThresholdFraction(m.thresholdKey ?? "thresholdSimpleMajority");
        const needed = Math.ceil(totalMembers * threshold);
        m.outcome    = m.approvalCount >= needed ? "passed" : "failed";
        m.stage      = "resolved";
        m.resolvedAt = new Date().toISOString();
        m.outcomeNote = `Resolved at deadline. ${m.approvalCount}/${totalMembers} approved (needed ${needed}).`;
        if (m.outcome === "passed") effectRegistry.dispatch(m);
        this.loader.save(m);
    }

    private checkReferendumResolution(m: Motion): void {
        const totalMembers = PersonService.getInstance().getAll().length;
        const threshold = this.getThresholdFraction(m.thresholdKey ?? "thresholdSimpleMajority");
        const needed = Math.ceil(totalMembers * threshold);

        if (m.approvalCount >= needed) {
            m.outcome    = "passed";
            m.stage      = "resolved";
            m.resolvedAt = new Date().toISOString();
            m.outcomeNote = `Passed with ${m.approvalCount}/${totalMembers} approvals.`;
            effectRegistry.dispatch(m);
            this.loader.save(m);
            return;
        }

        // Early rejection: strict majority voted reject and threshold cannot be met
        const rejectThreshold = Math.floor(totalMembers / 2) + 1;
        if (m.rejectionCount >= rejectThreshold) {
            m.outcome    = "failed";
            m.stage      = "resolved";
            m.resolvedAt = new Date().toISOString();
            m.outcomeNote = `Rejected with ${m.rejectionCount}/${totalMembers} rejections.`;
            this.loader.save(m);
        }
    }

    private getThresholdFraction(key: string): number {
        try {
            return Constitution.getInstance().get<number>(key);
        } catch {
            return 0.51;
        }
    }
}
