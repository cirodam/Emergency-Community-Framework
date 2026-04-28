import { Router } from "express";
import { requirePersonCredential } from "@ecf/core";
import { getCommunityIdentity } from "../communityIdentity.js";
import {
    listClassifieds,
    getClassified,
    createClassifiedWithHandle as createClassified,
    updateClassified,
    cancelClassified,
    claimClassified,
} from "./ClassifiedController.js";
import {
    listStalls,
    getStall,
    createStall,
    updateStall,
    deleteStall,
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
const requireAuth = requirePersonCredential(getCommunityIdentity);

// ── Classifieds ───────────────────────────────────────────────────────────────
router.get(   "/classifieds",           listClassifieds);
router.get(   "/classifieds/:id",       getClassified);
router.post(  "/classifieds",           requireAuth, createClassified);
router.patch( "/classifieds/:id",       requireAuth, updateClassified);
router.delete("/classifieds/:id",       requireAuth, cancelClassified);
router.post(  "/classifieds/:id/claim", requireAuth, claimClassified);

// ── Stalls ────────────────────────────────────────────────────────────────────
router.get(   "/stalls",     listStalls);
router.get(   "/stalls/:id", getStall);
router.post(  "/stalls",     requireAuth, createStall);
router.patch( "/stalls/:id", requireAuth, updateStall);
router.delete("/stalls/:id", requireAuth, deleteStall);

// ── Services ──────────────────────────────────────────────────────────────────
router.get(   "/services",     listServices);
router.get(   "/services/:id", getService);
router.post(  "/services",     requireAuth, createService);
router.patch( "/services/:id", requireAuth, updateService);
router.delete("/services/:id", requireAuth, deleteService);

// ── Marketplaces ──────────────────────────────────────────────────────────────
router.get(   "/marketplaces",     listMarketplaces);
router.get(   "/marketplaces/:id", getMarketplace);
router.post(  "/marketplaces",     requireAuth, createMarketplace);
router.patch( "/marketplaces/:id", requireAuth, updateMarketplace);
router.delete("/marketplaces/:id", requireAuth, deleteMarketplace);

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
