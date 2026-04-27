import { Router } from "express";
import { requireMemberCommunity } from "./memberAuthMiddleware.js";
import {
    submitApplication,
    listApplications,
    getApplication,
    getApplicationByNodeId,
    reviewApplication,
    listMembers,
    getEconomics,
    transferKithe,
    issueKithe,
    getTreasury,
    getConstitution,
    getBudget,
    listDomains,
} from "./FederationController.js";

const router = Router();

// Applications — open submit (self-signed), operator review
router.post( "/applications",                 submitApplication);
router.get(  "/applications",                 listApplications);
router.get(  "/applications/by-node/:nodeId", getApplicationByNodeId);
router.get(  "/applications/:id",             getApplication);
router.patch("/applications/:id",             reviewApplication);  // TODO: operator auth

// Members + economics (read-only, public)
router.get("/members",   listMembers);
router.get("/economics", getEconomics);

// Treasury, constitution, budget, domains (read-only, public)
router.get("/treasury",     getTreasury);
router.get("/constitution",  getConstitution);
router.get("/budget",        getBudget);
router.get("/domains",       listDomains);

// Authenticated: registered member community (Currency Board signing)
const requireMember = requireMemberCommunity();
router.post("/transfers",   requireMember, transferKithe);
router.post("/kithe/issue", requireMember, issueKithe);

export default router;
