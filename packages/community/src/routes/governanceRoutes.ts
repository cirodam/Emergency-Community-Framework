import { Router, Request, Response } from "express";
import { requireAuth, requireSteward } from "./middleware.js";
import * as proposals from "./ProposalController.js";
import * as motions   from "./MotionController.js";
import { Constitution } from "../governance/Constitution.js";

const router = Router();

router.get(   "/proposals",          proposals.listProposals);
router.get(   "/proposals/:id",      proposals.getProposal);
router.post(  "/proposals",          requireAuth, proposals.createProposal);
router.post(  "/proposals/:id/vote", requireAuth, proposals.voteOnProposal);
router.delete("/proposals/:id",      requireAuth, proposals.withdrawProposal);

// ── Motions ───────────────────────────────────────────────────────────────────
router.get(   "/motions",                    motions.listMotions);
router.get(   "/motions/:id",                motions.getMotion);
router.post(  "/motions",                    requireAuth,    motions.createMotion);
router.post(  "/motions/:id/deliberate",     requireAuth,    motions.submitForDeliberation);
router.post(  "/motions/:id/open-voting",    requireAuth,    motions.openVoting);
router.post(  "/motions/:id/vote",           requireAuth,    motions.castVote);
router.post(  "/motions/:id/comment",        requireAuth,    motions.addComment);
router.post(  "/motions/:id/discuss",        requireSteward, motions.markDiscussed);
router.post(  "/motions/:id/outcome",        requireSteward, motions.recordOutcome);
router.delete("/motions/:id",                requireAuth,    motions.withdrawMotion);

// PATCH /api/constitution/parameters/:key
// Body: { value: number | boolean }
// Steward-only direct override — for experimental use.
router.patch("/constitution/parameters/:key", requireSteward, (req: Request, res: Response) => {
    const key = req.params.key as string;
    const { value } = (req.body ?? {}) as { value?: unknown };
    if (typeof value !== "number" && typeof value !== "boolean") {
        res.status(400).json({ error: "value must be a number or boolean" }); return;
    }
    try {
        const con = Constitution.getInstance();
        con.amend(key, value, "steward-override");
        con.save();
        res.json({ key, value: con.get(key) });
    } catch (err) {
        res.status(400).json({ error: (err as Error).message });
    }
});

// PATCH /api/constitution/sections/:sectionId
// Body: { body: string }
// Steward-only direct override of a section's prose text.
router.patch("/constitution/sections/:sectionId", requireSteward, (req: Request, res: Response) => {
    const sectionId = req.params.sectionId as string;
    const { body } = (req.body ?? {}) as { body?: unknown };
    if (typeof body !== "string" || !body.trim()) {
        res.status(400).json({ error: "body is required and must be a non-empty string" }); return;
    }
    try {
        const con = Constitution.getInstance();
        con.updateSection(sectionId, body.trim());
        con.save();
        res.json(con.toDocument());
    } catch (err) {
        res.status(400).json({ error: (err as Error).message });
    }
});

export default router;
