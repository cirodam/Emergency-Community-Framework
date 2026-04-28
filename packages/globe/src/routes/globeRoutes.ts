import { Router } from "express";
import { requireMemberCommonwealth } from "./memberAuthMiddleware.js";
import {
    submitApplication,
    listApplications,
    getApplication,
    getApplicationByNodeId,
    reviewApplication,
    listMembers,
    getEconomics,
    transferKin,
    structuralAidGrant,
    getTreasury,
    getConstitution,
} from "./GlobeController.js";

const router = Router();

// Applications — open submit (self-signed by commonwealth), operator review
router.post( "/applications",                 submitApplication);
router.get(  "/applications",                 listApplications);
router.get(  "/applications/by-node/:nodeId", getApplicationByNodeId);
router.get(  "/applications/:id",             getApplication);
router.patch("/applications/:id",             reviewApplication);  // TODO: operator auth

// Members + economics (read-only, public)
router.get("/members",   listMembers);
router.get("/economics", getEconomics);

// Treasury + constitution (read-only, public)
router.get("/treasury",     getTreasury);
router.get("/constitution",  getConstitution);

// Authenticated: registered member commonwealth
const requireMember = requireMemberCommonwealth();
router.post("/transfers",          requireMember, transferKin);
router.post("/kin/structural-aid", requireMember, structuralAidGrant);

export default router;
