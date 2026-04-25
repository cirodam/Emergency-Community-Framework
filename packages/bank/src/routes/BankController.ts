import { Request, Response } from "express";
import { Bank } from "../Bank.js";
import { Currency } from "../BankTransaction.js";

const CURRENCIES: Currency[] = ["kin", "kithe"];
const bank = () => Bank.getInstance();

// GET /api/accounts/:ownerId
export function getAccounts(req: Request, res: Response): void {
    const accounts = bank().getAccounts(req.params.ownerId as string);
    if (accounts.length === 0) {
        res.status(404).json({ error: "No accounts found for owner" });
        return;
    }
    res.json(accounts.map(toAccountDto));
}

// GET /api/account/:accountId
export function getAccountById(req: Request, res: Response): void {
    const account = bank().getAccount(req.params.accountId as string);
    if (!account) {
        res.status(404).json({ error: "Account not found" });
        return;
    }
    res.json(toAccountDto(account));
}

// GET /api/accounts/:accountId/transactions?month=YYYY-MM
export function getTransactions(req: Request, res: Response): void {
    const accountId = req.params.accountId as string;
    const account = bank().getAccount(accountId);
    if (!account) {
        res.status(404).json({ error: "Account not found" });
        return;
    }

    const { month } = req.query;
    if (month !== undefined && (typeof month !== "string" || !/^\d{4}-\d{2}$/.test(month))) {
        res.status(400).json({ error: "month must be in YYYY-MM format" });
        return;
    }

    const txs = bank().getTransactions(accountId, month as string | undefined);
    res.json(txs.map(toTxDto));
}

// POST /api/transfers
// Body: { fromAccountId, toAccountId, currency, amount, memo? }
export function createTransfer(req: Request, res: Response): void {
    const { fromAccountId, toAccountId, currency, amount, memo } = req.body ?? {};

    if (typeof fromAccountId !== "string" || !fromAccountId) {
        res.status(400).json({ error: "fromAccountId is required" });
        return;
    }
    if (typeof toAccountId !== "string" || !toAccountId) {
        res.status(400).json({ error: "toAccountId is required" });
        return;
    }
    if (!CURRENCIES.includes(currency)) {
        res.status(400).json({ error: `currency must be one of: ${CURRENCIES.join(", ")}` });
        return;
    }
    if (typeof amount !== "number" || amount <= 0) {
        res.status(400).json({ error: "amount must be a positive number" });
        return;
    }
    if (memo !== undefined && typeof memo !== "string") {
        res.status(400).json({ error: "memo must be a string" });
        return;
    }

    try {
        const tx = bank().transfer(fromAccountId, toAccountId, currency as Currency, amount, memo ?? "");
        res.status(201).json(toTxDto(tx));
    } catch (err) {
        res.status(422).json({ error: (err as Error).message });
    }
}

function toAccountDto(a: { id: string; ownerId: string; label: string; kin: number; overdraftLimit: number; exemptFromDemurrage: boolean; createdAt: Date }) {
    return {
        id:                  a.id,
        ownerId:             a.ownerId,
        label:               a.label,
        kin:                 a.kin,
        overdraftLimit:      a.overdraftLimit,
        exemptFromDemurrage: a.exemptFromDemurrage,
        createdAt:           a.createdAt,
    };
}

function toTxDto(t: { id: string; fromAccountId: string; toAccountId: string; currency: Currency; amount: number; memo: string; timestamp: Date }) {
    return {
        id:            t.id,
        fromAccountId: t.fromAccountId,
        toAccountId:   t.toAccountId,
        currency:      t.currency,
        amount:        t.amount,
        memo:          t.memo,
        timestamp:     t.timestamp,
    };
}
