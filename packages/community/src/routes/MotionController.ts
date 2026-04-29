import { Request, Response } from "express";
import { MotionService } from "../governance/MotionService.js";
import { Motion, type VoteThresholdKey } from "../governance/Motion.js";
import { PersonService } from "../person/PersonService.js";

type AuthedRequest = Request & { personId?: string };

const svc = () => MotionService.getInstance();
const ppl = () => PersonService.getInstance();

function toDto(m: Motion) {
    return m.toData();
}

// GET /api/motions?body=referendum&stage=deliberating
export function listMotions(req: Request, res: Response): void {
    const { body, stage } = req.query;
    let results = svc().getAll();
    if (typeof body  === "string") results = results.filter(m => m.body  === body);
    if (typeof stage === "string") results = results.filter(m => m.stage === stage);
    results.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    res.json(results.map(toDto));
}

// GET /api/motions/:id
export function getMotion(req: Request, res: Response): void {
    const m = svc().get(req.params.id as string);
    if (!m) { res.status(404).json({ error: "Motion not found" }); return; }
    res.json(toDto(m));
}

// POST /api/motions
// Body: { body, title, description, parentId? }
export function createMotion(req: AuthedRequest, res: Response): void {
    const personId = req.personId;
    if (!personId) { res.status(401).json({ error: "Unauthorized" }); return; }

    const { body, title, description, parentId } = req.body ?? {};

    if (typeof body  !== "string" || !body.trim())  { res.status(400).json({ error: "body is required" }); return; }
    if (typeof title !== "string" || !title.trim()) { res.status(400).json({ error: "title is required" }); return; }
    if (typeof description !== "string" || !description.trim()) { res.status(400).json({ error: "description is required" }); return; }

    const person = ppl().get(personId);
    const handle = person?.handle ?? personId;

    try {
        const motion = svc().create({
            body:           body.trim(),
            title:          title.trim(),
            description:    description.trim(),
            proposerId:     personId,
            proposerHandle: handle,
            parentId:       typeof parentId === "string" ? parentId : undefined,
        });
        res.status(201).json(toDto(motion));
    } catch (err) {
        res.status(400).json({ error: (err as Error).message });
    }
}

// POST /api/motions/:id/deliberate
// Body: { thresholdKey? }
export function submitForDeliberation(req: AuthedRequest, res: Response): void {
    const personId = req.personId;
    if (!personId) { res.status(401).json({ error: "Unauthorized" }); return; }

    const { thresholdKey } = req.body ?? {};
    const validKeys: VoteThresholdKey[] = [
        "thresholdSimpleMajority",
        "thresholdSupermajority",
        "thresholdNearConsensus",
    ];
    if (thresholdKey !== undefined && !validKeys.includes(thresholdKey as VoteThresholdKey)) {
        res.status(400).json({ error: `thresholdKey must be one of: ${validKeys.join(", ")}` }); return;
    }

    try {
        const motion = svc().submitForDeliberation(
            req.params.id as string,
            personId,
            (thresholdKey as VoteThresholdKey | undefined) ?? "thresholdSimpleMajority",
        );
        res.json(toDto(motion));
    } catch (err) {
        res.status(400).json({ error: (err as Error).message });
    }
}

// POST /api/motions/:id/open-voting
export function openVoting(req: AuthedRequest, res: Response): void {
    const personId = req.personId;
    if (!personId) { res.status(401).json({ error: "Unauthorized" }); return; }

    try {
        const motion = svc().openVoting(req.params.id as string, personId);
        res.json(toDto(motion));
    } catch (err) {
        res.status(400).json({ error: (err as Error).message });
    }
}

// POST /api/motions/:id/vote
// Body: { vote: "approve" | "reject" | "abstain" }
export function castVote(req: AuthedRequest, res: Response): void {
    const personId = req.personId;
    if (!personId) { res.status(401).json({ error: "Unauthorized" }); return; }

    const { vote } = req.body ?? {};
    const validVotes = ["approve", "reject", "abstain"];
    if (!validVotes.includes(vote as string)) {
        res.status(400).json({ error: `vote must be one of: ${validVotes.join(", ")}` }); return;
    }

    const person = ppl().get(personId);
    const handle = person?.handle ?? personId;

    try {
        const motion = svc().castVote(req.params.id as string, personId, handle, vote as "approve" | "reject" | "abstain");
        res.json(toDto(motion));
    } catch (err) {
        res.status(400).json({ error: (err as Error).message });
    }
}

// POST /api/motions/:id/comment
// Body: { body: string }
export function addComment(req: AuthedRequest, res: Response): void {
    const personId = req.personId;
    if (!personId) { res.status(401).json({ error: "Unauthorized" }); return; }

    const { body } = req.body ?? {};
    if (typeof body !== "string" || !body.trim()) {
        res.status(400).json({ error: "body is required" }); return;
    }

    const person = ppl().get(personId);
    const handle = person?.handle ?? personId;

    try {
        const motion = svc().addComment(req.params.id as string, personId, handle, body.trim());
        res.json(toDto(motion));
    } catch (err) {
        res.status(400).json({ error: (err as Error).message });
    }
}

// POST /api/motions/:id/discuss  (steward clerk action)
export function markDiscussed(req: AuthedRequest, res: Response): void {
    try {
        const motion = svc().markDiscussed(req.params.id as string);
        res.json(toDto(motion));
    } catch (err) {
        res.status(400).json({ error: (err as Error).message });
    }
}

// POST /api/motions/:id/outcome  (steward clerk action)
// Body: { outcome: "passed" | "failed" | "withdrawn" | "referred", outcomeNote? }
export function recordOutcome(req: AuthedRequest, res: Response): void {
    const { outcome, outcomeNote } = req.body ?? {};
    const validOutcomes = ["passed", "failed", "withdrawn", "referred"];
    if (!validOutcomes.includes(outcome as string)) {
        res.status(400).json({ error: `outcome must be one of: ${validOutcomes.join(", ")}` }); return;
    }

    try {
        const motion = svc().recordOutcome(
            req.params.id as string,
            outcome as "passed" | "failed" | "withdrawn" | "referred",
            typeof outcomeNote === "string" ? outcomeNote : "",
        );
        res.json(toDto(motion));
    } catch (err) {
        res.status(400).json({ error: (err as Error).message });
    }
}

// DELETE /api/motions/:id  (withdraw)
export function withdrawMotion(req: AuthedRequest, res: Response): void {
    const personId = req.personId;
    if (!personId) { res.status(401).json({ error: "Unauthorized" }); return; }

    try {
        const motion = svc().withdraw(req.params.id as string, personId);
        res.json(toDto(motion));
    } catch (err) {
        res.status(400).json({ error: (err as Error).message });
    }
}
