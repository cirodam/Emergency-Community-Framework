import { Router } from "express";
import { createAccount, getAllAccounts, getAccounts, getAccountById, getTransactions, createTransfer, applyDemurrage } from "./BankController.js";

const router = Router();

router.get( "/accounts",                         getAllAccounts);
router.post("/accounts",                         createAccount);
router.get( "/accounts/:ownerId",                getAccounts);
router.get( "/account/:accountId",               getAccountById);
router.get( "/accounts/:accountId/transactions", getTransactions);
router.post("/transfers",                        createTransfer);
router.post("/demurrage",                        applyDemurrage);

export default router;
