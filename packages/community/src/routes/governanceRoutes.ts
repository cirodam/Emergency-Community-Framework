import { Router } from "express";
import { requireAuth } from "./middleware.js";
import * as proposals from "./ProposalController.js";

const router = Router();

router.get(   "/proposals",          proposals.listProposals);
router.get(   "/proposals/:id",      proposals.getProposal);
router.post(  "/proposals",          requireAuth, proposals.createProposal);
router.post(  "/proposals/:id/vote", requireAuth, proposals.voteOnProposal);
router.delete("/proposals/:id",      requireAuth, proposals.withdrawProposal);

export default router;
