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
    getClearingBalances,
} from "./FederationController.js";
import {
    getAssembly,
    startAssemblyTerm,
    seatDelegate,
    vacateSeat,
    listMotions,
    createMotion,
    getMotion,
    advanceMotion,
    listInsuranceClaims,
    submitInsuranceClaim,
    getInsuranceClaim,
    reviewInsuranceClaim,
} from "./FederationGovernanceController.js";

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

// ── Assembly ───────────────────────────────────────────────────────────────
router.get(   "/assembly",                     getAssembly);
router.post(  "/assembly/terms",               startAssemblyTerm);
router.post(  "/assembly/delegates",           requireMember, seatDelegate);
router.delete("/assembly/delegates/:communityMemberId", requireMember, vacateSeat);

// ── Motions ────────────────────────────────────────────────────────────────
router.get( "/motions",     listMotions);
router.post("/motions",     requireMember, createMotion);
router.get( "/motions/:id", getMotion);
router.patch("/motions/:id", requireMember, advanceMotion);

// ── Clearing ──────────────────────────────────────────────────────────────
router.get("/clearing/balances", getClearingBalances);

// ── Health Insurance ───────────────────────────────────────────────────────
router.get( "/insurance/claims",     listInsuranceClaims);
router.post("/insurance/claims",     requireMember, submitInsuranceClaim);
router.get( "/insurance/claims/:id", getInsuranceClaim);
router.patch("/insurance/claims/:id", requireMember, reviewInsuranceClaim);

export default router;
