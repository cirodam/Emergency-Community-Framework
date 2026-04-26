import { Router } from "express";
import { requirePersonCredential } from "@ecf/core";
import { getCommunityIdentity } from "../communityIdentity.js";
import { login } from "./AuthController.js";
import {
    listListings,
    getListing,
    createListing,
    updateListing,
    cancelListing,
    purchaseListing,
} from "./ListingController.js";

const router = Router();

const requireAuth = requirePersonCredential(getCommunityIdentity);

// Auth (SSO proxy to community)
router.post("/auth/login", login);

// Public
router.get("/listings",     listListings);
router.get("/listings/:id", getListing);

// Authenticated
router.post(  "/listings",              requireAuth, createListing);
router.patch( "/listings/:id",          requireAuth, updateListing);
router.delete("/listings/:id",          requireAuth, cancelListing);
router.post(  "/listings/:id/purchase", requireAuth, purchaseListing);

export default router;
