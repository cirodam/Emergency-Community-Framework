import { Router } from "express";
import { requirePersonCredential } from "@ecf/core";
import { getCommunityIdentity } from "../communityIdentity.js";
import {
    listListings,
    getListing,
    createListing,
    updateListing,
    cancelListing,
    purchaseListing,
    fulfillListing,
} from "./ListingController.js";

const router = Router();

const requireAuth = requirePersonCredential(getCommunityIdentity);

// Public
router.get("/listings",     listListings);
router.get("/listings/:id", getListing);

// Authenticated
router.post(  "/listings",              requireAuth, createListing);
router.patch( "/listings/:id",          requireAuth, updateListing);
router.delete("/listings/:id",          requireAuth, cancelListing);
router.post(  "/listings/:id/purchase", requireAuth, purchaseListing);
router.post(  "/listings/:id/fulfill",  requireAuth, fulfillListing);

export default router;
