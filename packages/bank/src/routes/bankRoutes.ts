import { Router } from "express";
import { createAccount, getAllAccounts, getAccounts, getAccountById, getTransactions, createTransfer } from "./BankController.js";

const router = Router();

router.get( "/accounts",                         getAllAccounts);
router.post("/accounts",                         createAccount);
router.get( "/accounts/:ownerId",                getAccounts);
router.get( "/account/:accountId",               getAccountById);
router.get( "/accounts/:accountId/transactions", getTransactions);
router.post("/transfers",                        createTransfer);

export default router;
