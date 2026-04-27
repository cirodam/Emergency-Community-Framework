import { Request, Response } from "express";
import { ProposalService } from "../governance/ProposalService.js";
import { Proposal, ProposalType, PROPOSAL_TYPES } from "../governance/Proposal.js";
import { PersonService } from "../person/PersonService.js";

type AuthedRequest = Request & { personId?: string };

const svc  = () => ProposalService.getInstance();
const ppl  = () => PersonService.getInstance();

function toDto(p: Proposal) {
    return {
        id:              p.id,
        type:            p.type,
        poolId:          p.poolId,
        proposerId:      p.proposerId,
        proposerHandle:  p.proposerHandle,
        title:           p.title,
        description:     p.description,
        payload:         p.payload,
        approvalsNeeded: p.approvalsNeeded,
        status:          p.status,
        votes:           p.votes,
        approvalCount:   p.approvalCount,
        rejectionCount:  p.rejectionCount,
        createdAt:       p.createdAt,
        expiresAt:       p.expiresAt,
        executedAt:      p.executedAt,
        outcomeNote:     p.outcomeNote,
    };
}

// GET /api/proposals?status=open&poolId=...
export function listProposals(req: Request, res: Response): void {
    const { status, poolId } = req.query;
    let results = svc().getAll();
    if (status) results = results.filter(p => p.status === status);
    if (poolId) results = results.filter(p => p.poolId === poolId);
    results.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    res.json(results.map(toDto));
}

// GET /api/proposals/:id
export function getProposal(req: Request, res: Response): void {
    const p = svc().get(req.params.id as string);
    if (!p) { res.status(404).json({ error: "Proposal not found" }); return; }
    res.json(toDto(p));
}

// POST /api/proposals
// Body: { type, poolId, title, description, payload?, approvalsNeeded, ttlDays? }
export function createProposal(req: AuthedRequest, res: Response): void {
    const personId = req.personId;
    if (!personId) { res.status(401).json({ error: "Unauthorized" }); return; }

    const { type, poolId, title, description, payload, approvalsNeeded, ttlDays } = req.body ?? {};

    if (!type || !PROPOSAL_TYPES.includes(type as ProposalType)) {
        res.status(400).json({ error: `type must be one of: ${PROPOSAL_TYPES.join(", ")}` }); return;
    }
    if (typeof poolId !== "string" || !poolId) {
        res.status(400).json({ error: "poolId is required" }); return;
    }
    if (typeof title !== "string" || !title.trim()) {
        res.status(400).json({ error: "title is required" }); return;
    }
    if (typeof description !== "string" || !description.trim()) {
        res.status(400).json({ error: "description is required" }); return;
    }
    const approvals = Number(approvalsNeeded);
    if (!Number.isInteger(approvals) || approvals < 1) {
        res.status(400).json({ error: "approvalsNeeded must be a positive integer" }); return;
    }

    const person = ppl().get(personId);
    const handle = person?.handle ?? personId;

    try {
        const proposal = svc().create({
            type:            type as ProposalType,
            poolId,
            proposerId:      personId,
            proposerHandle:  handle,
            title:           title.trim(),
            description:     description.trim(),
            payload:         (payload && typeof payload === "object" && !Array.isArray(payload))
                                 ? (payload as Record<string, unknown>)
                                 : {},
            approvalsNeeded: approvals,
            ttlDays:         ttlDays ? Number(ttlDays) : undefined,
        });
        res.status(201).json(toDto(proposal));
    } catch (err) {
        res.status(400).json({ error: (err as Error).message });
    }
}

// POST /api/proposals/:id/vote
// Body: { vote: "approve" | "reject" | "abstain", comment? }
export function voteOnProposal(req: AuthedRequest, res: Response): void {
    const personId = req.personId;
    if (!personId) { res.status(401).json({ error: "Unauthorized" }); return; }

    const { vote, comment } = req.body ?? {};
    if (!["approve", "reject", "abstain"].includes(vote)) {
        res.status(400).json({ error: 'vote must be "approve", "reject", or "abstain"' }); return;
    }

    const person = ppl().get(personId);
    const handle = person?.handle ?? personId;

    try {
        const proposal = svc().castVote(
            req.params.id as string,
            personId,
            handle,
            vote as "approve" | "reject" | "abstain",
            typeof comment === "string" ? comment : "",
        );
        res.json(toDto(proposal));
    } catch (err) {
        res.status(400).json({ error: (err as Error).message });
    }
}

// DELETE /api/proposals/:id  (withdraw — proposer only)
export function withdrawProposal(req: AuthedRequest, res: Response): void {
    const personId = req.personId;
    if (!personId) { res.status(401).json({ error: "Unauthorized" }); return; }
    try {
        const proposal = svc().withdraw(req.params.id as string, personId);
        res.json(toDto(proposal));
    } catch (err) {
        res.status(400).json({ error: (err as Error).message });
    }
}
