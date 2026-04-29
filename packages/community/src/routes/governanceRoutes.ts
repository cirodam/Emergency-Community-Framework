import { Router, Request, Response } from "express";
import { requireAuth, requireSteward } from "./middleware.js";
import * as proposals from "./ProposalController.js";
import { Constitution } from "../governance/Constitution.js";

const router = Router();

router.get(   "/proposals",          proposals.listProposals);
router.get(   "/proposals/:id",      proposals.getProposal);
router.post(  "/proposals",          requireAuth, proposals.createProposal);
router.post(  "/proposals/:id/vote", requireAuth, proposals.voteOnProposal);
router.delete("/proposals/:id",      requireAuth, proposals.withdrawProposal);

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

export default router;
