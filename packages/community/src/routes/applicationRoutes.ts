import { Router } from "express";
import rateLimit from "express-rate-limit";
import { requireAuth } from "./middleware.js";
import * as applications from "./ApplicationController.js";

const applyRateLimit = rateLimit({
    windowMs: 60 * 1000,
    limit: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many applications submitted from this IP, please try again later." },
});

const router = Router();

router.post(  "/apply",                     applyRateLimit, applications.publicSubmitApplication);
router.get(   "/applications",              requireAuth, applications.listApplications);
router.post(  "/applications",              requireAuth, applications.submitApplication);
router.get(   "/applications/:id",          requireAuth, applications.getApplication);
router.post(  "/applications/:id/vouch",    requireAuth, applications.vouchForApplication);
router.delete("/applications/:id/vouch",    requireAuth, applications.removeVouch);
router.post(  "/applications/:id/withdraw", requireAuth, applications.withdrawApplication);

export default router;
