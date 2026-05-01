import { Router, Request, Response } from "express";
import { requireAuth, requireSteward } from "./middleware.js";
import * as proposals from "./ProposalController.js";
import * as motions   from "./MotionController.js";
import { Constitution } from "../governance/Constitution.js";
import { BylawLoader } from "../governance/BylawLoader.js";

const router = Router();
const bylaws = new BylawLoader();

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

// ── Bylaws ────────────────────────────────────────────────────────────────────

router.get("/bylaws", (_req: Request, res: Response) => {
    res.json(bylaws.loadAll());
});

router.get("/bylaws/:id", (req: Request, res: Response) => {
    const bylaw = bylaws.load(req.params.id as string);
    if (!bylaw) { res.status(404).json({ error: "Bylaw not found" }); return; }
    res.json(bylaw);
});

router.post("/bylaws", requireSteward, (req: Request, res: Response) => {
    const { title, preamble } = (req.body ?? {}) as { title?: string; preamble?: string };
    if (!title?.trim()) { res.status(400).json({ error: "title is required" }); return; }
    try {
        res.status(201).json(bylaws.create(title, preamble));
    } catch (err) {
        res.status(400).json({ error: (err as Error).message });
    }
});

router.post("/bylaws/:id/articles", requireSteward, (req: Request, res: Response) => {
    const { number, title, preamble } = (req.body ?? {}) as { number?: string; title?: string; preamble?: string };
    if (!number?.trim() || !title?.trim()) { res.status(400).json({ error: "number and title are required" }); return; }
    try {
        res.status(201).json(bylaws.addArticle(req.params.id as string, number, title, preamble));
    } catch (err) {
        const msg = (err as Error).message;
        res.status(msg.includes("not found") ? 404 : 409).json({ error: msg });
    }
});

router.post("/bylaws/:id/articles/:number/sections", requireSteward, (req: Request, res: Response) => {
    const { sectionId, title, body } = (req.body ?? {}) as { sectionId?: string; title?: string; body?: string };
    if (!sectionId?.trim() || !body?.trim()) { res.status(400).json({ error: "sectionId and body are required" }); return; }
    try {
        res.status(201).json(bylaws.addSection(req.params.id as string, req.params.number as string, sectionId, title ?? "", body));
    } catch (err) {
        const msg = (err as Error).message;
        res.status(msg.includes("not found") ? 404 : 409).json({ error: msg });
    }
});

router.patch("/bylaws/:id/sections/:sectionId", requireSteward, (req: Request, res: Response) => {
    const { body } = (req.body ?? {}) as { body?: string };
    if (!body?.trim()) { res.status(400).json({ error: "body is required" }); return; }
    try {
        res.json(bylaws.updateSection(req.params.id as string, req.params.sectionId as string, body));
    } catch (err) {
        const msg = (err as Error).message;
        res.status(msg.includes("not found") ? 404 : 400).json({ error: msg });
    }
});

router.delete("/bylaws/:id", requireSteward, (req: Request, res: Response) => {
    if (!bylaws.load(req.params.id as string)) { res.status(404).json({ error: "Bylaw not found" }); return; }
    bylaws.delete(req.params.id as string);
    res.status(204).end();
});

export default router;
