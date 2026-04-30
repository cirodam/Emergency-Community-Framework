import { Router } from "express";
import { requireAuth, requireCoordinator, requireMarketAccess } from "./middleware.js";
import {
    listClassifieds,
    getClassified,
    createClassifiedWithHandle as createClassified,
    updateClassified,
    cancelClassified,
    claimClassified,
    adminCancelClassified,
} from "./ClassifiedController.js";
import {
    listStalls,
    getStall,
    createStall,
    updateStall,
    deleteStall,
    adminSuspendStall,
    adminUnsuspendStall,
} from "./StallController.js";
import {
    listServices,
    getService,
    createService,
    updateService,
    deleteService,
} from "./ServiceProfileController.js";
import {
    listMarketplaces,
    getMarketplace,
    createMarketplace,
    updateMarketplace,
    deleteMarketplace,
} from "./MarketplaceController.js";

const router = Router();

// ── Classifieds ───────────────────────────────────────────────────────────────
router.get(   "/classifieds",           listClassifieds);
router.get(   "/classifieds/:id",       getClassified);
router.post(  "/classifieds",           ...requireMarketAccess, createClassified);
router.patch( "/classifieds/:id",       ...requireMarketAccess, updateClassified);
router.delete("/classifieds/:id",       ...requireMarketAccess, cancelClassified);
router.post(  "/classifieds/:id/claim", ...requireMarketAccess, claimClassified);

// ── Stalls ────────────────────────────────────────────────────────────────
router.get(   "/stalls",     listStalls);
router.get(   "/stalls/:id", getStall);
router.post(  "/stalls",     ...requireMarketAccess, createStall);
router.patch( "/stalls/:id", ...requireMarketAccess, updateStall);
router.delete("/stalls/:id", ...requireMarketAccess, deleteStall);

// ── Coordinator / admin routes ────────────────────────────────────────────────
router.delete("/admin/classifieds/:id",        ...requireCoordinator, adminCancelClassified);
router.patch( "/admin/stalls/:id/suspend",     ...requireCoordinator, adminSuspendStall);
router.patch( "/admin/stalls/:id/unsuspend",   ...requireCoordinator, adminUnsuspendStall);

// ── Services ──────────────────────────────────────────────────────────────────
router.get(   "/services",     listServices);
router.get(   "/services/:id", getService);
router.post(  "/services",     ...requireMarketAccess, createService);
router.patch( "/services/:id", ...requireMarketAccess, updateService);
router.delete("/services/:id", ...requireMarketAccess, deleteService);

// ── Marketplaces ──────────────────────────────────────────────────────────────
router.get(   "/marketplaces",     listMarketplaces);
router.get(   "/marketplaces/:id", getMarketplace);
router.post(  "/marketplaces",     ...requireMarketAccess, createMarketplace);
router.patch( "/marketplaces/:id", ...requireMarketAccess, updateMarketplace);
router.delete("/marketplaces/:id", ...requireMarketAccess, deleteMarketplace);

// ── Community proxy: locations ────────────────────────────────────────────────
// The browser cannot POST directly to the community server (different origin).
// These routes forward location reads/writes server-side, carrying the auth token.
router.get("/community/locations", async (req, res) => {
    const communityUrl = (process.env.COMMUNITY_URL ?? "http://localhost:3002").replace(/\/$/, "");
    try {
        const r = await fetch(`${communityUrl}/api/locations`);
        const body = await r.json();
        res.status(r.status).json(body);
    } catch (e) {
        res.status(502).json({ error: "community unavailable" });
    }
});

router.post("/community/locations", requireAuth, async (req, res) => {
    const communityUrl = (process.env.COMMUNITY_URL ?? "http://localhost:3002").replace(/\/$/, "");
    const authHeader   = req.headers["authorization"] ?? "";
    try {
        const r = await fetch(`${communityUrl}/api/locations`, {
            method:  "POST",
            headers: { "Content-Type": "application/json", "Authorization": authHeader },
            body:    JSON.stringify(req.body),
        });
        const body = await r.json();
        res.status(r.status).json(body);
    } catch (e) {
        res.status(502).json({ error: "community unavailable" });
    }
});

export default router;
