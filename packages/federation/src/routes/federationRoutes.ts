import { Router } from "express";
import { requireMemberCommunity } from "./memberAuthMiddleware.js";
import { requireFederationMemberPerson } from "./personCredentialMiddleware.js";
import { verifyFederationCredential, getMe } from "./FederationAuthController.js";
import {
    submitApplication,
    listApplications,
    getApplication,
    getApplicationByNodeId,
    reviewApplication,
    listMembers,
    getEconomics,
    transferKithe,
    structuralAidGrant,
    getTreasury,
    getConstitution,
    getBudget,
    listDomains,
    getCensusSummary,
} from "./FederationController.js";

const router = Router();

// ── Person auth (any member community citizen) ─────────────────────────────
router.post("/auth/verify", verifyFederationCredential);
router.get( "/me",          requireFederationMemberPerson(), getMe);

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

// Authenticated: registered member community
const requireMember = requireMemberCommunity();
router.post("/transfers",          requireMember, transferKithe);
router.post("/kithe/structural-aid", requireMember, structuralAidGrant);

// Census — public summary only (submit is now via EcfMessage "governance.census.submit")
router.get( "/census", getCensusSummary);

export default router;
