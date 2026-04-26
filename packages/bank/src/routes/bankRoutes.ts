import { Router, type Request, type Response, type NextFunction } from "express";
import { requirePersonCredential, verifyNodeSignature } from "@ecf/core";
import { getCommunityIdentity } from "../communityIdentity.js";
import { createAccount, getAllAccounts, getAccounts, getAccountById, getTransactions, createTransfer, applyDemurrage } from "./BankController.js";

const router = Router();

// Middleware that verifies the Bearer PersonCredential on every authenticated route.
const requireAuth = requirePersonCredential(getCommunityIdentity);

// Middleware that verifies an x-node-signature from the owning community node.
const requireNodeAuth = verifyNodeSignature(() => getCommunityIdentity().publicKey);

// Accepts either a valid PersonCredential (person-initiated) or a community
// node signature (institutional caller). Tries node auth first; if the header
// is absent, falls through to PersonCredential verification.
function requireAuthOrNodeSignature(req: Request, res: Response, next: NextFunction): void {
    if (req.headers["x-node-signature"]) {
        requireNodeAuth(req, res, next);
    } else {
        requireAuth(req, res, next);
    }
}

// Admin / infrastructure routes — no user auth required
router.get( "/accounts",                         getAllAccounts);
router.post("/accounts",                         createAccount);
router.get( "/account/:accountId",               getAccountById);
router.post("/demurrage",                        requireAuthOrNodeSignature, applyDemurrage);

// Member routes — require a valid community-issued credential or node signature
router.get( "/accounts/:ownerId",                requireAuth, getAccounts);
router.get( "/accounts/:accountId/transactions", requireAuth, getTransactions);
router.post("/transfers",                        requireAuthOrNodeSignature, createTransfer);

export default router;
