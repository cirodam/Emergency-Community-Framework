import { Router } from "express";
import { getAccounts, getAccountById, getTransactions, createTransfer } from "./BankController.js";

const router = Router();

router.get("/accounts/:ownerId", getAccounts);
router.get("/account/:accountId", getAccountById);
router.get("/accounts/:accountId/transactions", getTransactions);
router.post("/transfers", createTransfer);

export default router;
