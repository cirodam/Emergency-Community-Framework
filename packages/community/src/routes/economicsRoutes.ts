import { Router } from "express";
import { requireAuth, requireSteward } from "./middleware.js";
import * as economics from "./EconomicsController.js";
import * as federation from "./FederationController.js";
import * as budget from "./BudgetController.js";
import * as paymentTokens from "./PaymentTokenController.js";
import * as transfers from "./TransferController.js";
import * as mailRelay from "./MailRelayController.js";

const router = Router();

// Economics (public transparency)
router.get("/economics", economics.getEconomics);
router.get("/budget",    budget.getCommunityBudget);

// Federation membership
router.get( "/federation",       federation.getFederationStatus);
router.post("/federation/apply", federation.applyToFederation);
router.get( "/federation/sync",  federation.syncFederationStatus);

// Payment tokens — steward-only management; receive is federation-signed
router.post(  "/payment-tokens",                  requireSteward, paymentTokens.issueToken);
router.post(  "/payment-tokens/:token/rotate",    requireSteward, paymentTokens.rotateToken);
router.delete("/payment-tokens/:token",           requireSteward, paymentTokens.revokeToken);
router.get(   "/payment-tokens/person/:personId", requireSteward, paymentTokens.listTokensForPerson);
router.post(  "/payment-tokens/receive",                          paymentTokens.receivePayment);

// Cross-community transfers
router.post("/transfers/out", requireAuth, transfers.sendTransfer);

// Cross-community mail relay (internal — called by local mail service)
router.post("/mail/route-external", mailRelay.routeExternalMail);

export default router;
