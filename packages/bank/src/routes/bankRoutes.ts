import { Router } from "express";
import { requirePersonCredential } from "@ecf/core";
import { getCommunityIdentity } from "../communityIdentity.js";
import { createAccount, getAllAccounts, getAccounts, getAccountById, getTransactions, createTransfer, applyDemurrage } from "./BankController.js";

const router = Router();

// Middleware that verifies the Bearer PersonCredential on every authenticated route.
const requireAuth = requirePersonCredential(getCommunityIdentity);

// Admin / infrastructure routes — no user auth required
router.get( "/accounts",                         getAllAccounts);
router.post("/accounts",                         createAccount);
router.get( "/account/:accountId",               getAccountById);
router.post("/demurrage",                        applyDemurrage);

// Member routes — require a valid community-issued credential
router.get( "/accounts/:ownerId",                requireAuth, getAccounts);
router.get( "/accounts/:accountId/transactions", requireAuth, getTransactions);
router.post("/transfers",                        requireAuth, createTransfer);

export default router;
