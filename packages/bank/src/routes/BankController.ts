import { Request, Response } from "express";
import { Bank } from "../Bank.js";
import { Currency } from "../BankTransaction.js";
import { IEconomicActor } from "@ecf/core";

const CURRENCIES: Currency[] = ["kin", "kithe"];

const bank = () => Bank.getInstance();

// POST /api/accounts
// Body: { ownerId, ownerName, currency, label?, overdraftLimit? }
export function createAccount(req: Request, res: Response): void {
    const { ownerId, ownerName, currency, label, overdraftLimit } = req.body ?? {};
    if (typeof ownerId !== "string" || !ownerId) {
        res.status(400).json({ error: "ownerId is required" }); return;
    }
    if (typeof ownerName !== "string" || !ownerName) {
        res.status(400).json({ error: "ownerName is required" }); return;
    }
    if (!CURRENCIES.includes(currency)) {
        res.status(400).json({ error: `currency must be one of: ${CURRENCIES.join(", ")}` }); return;
    }
    const owner: IEconomicActor = {
        getId: () => ownerId,
        getDisplayName: () => ownerName,
        getHandle: () => ownerName.toLowerCase().replace(/[^a-z0-9_]/g, "_"),
    };
    // null overdraftLimit → -Infinity (issuance accounts for central bank / currency board)
    const resolvedOverdraft = overdraftLimit === null ? -Infinity : (overdraftLimit ?? 0);
    const account = bank().openAccount(owner, label ?? "primary", currency as Currency, resolvedOverdraft);
    res.status(201).json(toAccountDto(account));
}

// GET /api/accounts (all accounts — admin use)
export function getAllAccounts(_req: Request, res: Response): void {
    res.json(bank().getAllAccounts().map(toAccountDto));
}

// GET /api/me/accounts — returns accounts for the authenticated person
export function getMyAccounts(req: Request & { personId?: string }, res: Response): void {
    const personId = req.personId;
    if (!personId) { res.status(401).json({ error: "Not authenticated" }); return; }
    const accounts = bank().getAccounts(personId);
    res.json(accounts.map(toAccountDto));
}

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
// Body: { fromAccountId, toAccountId, amount, memo? }
export async function createTransfer(req: Request, res: Response): Promise<void> {
    const { fromAccountId, toAccountId, amount, memo } = req.body ?? {};

    if (typeof fromAccountId !== "string" || !fromAccountId) {
        res.status(400).json({ error: "fromAccountId is required" });
        return;
    }
    if (typeof toAccountId !== "string" || !toAccountId) {
        res.status(400).json({ error: "toAccountId is required" });
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
        const tx = await bank().transfer(fromAccountId, toAccountId, amount, memo ?? "");
        res.status(201).json(toTxDto(tx));
    } catch (err) {
        res.status(422).json({ error: (err as Error).message });
    }
}

function toAccountDto(a: { accountId: string; ownerId: string; label: string; currency: string; amount: number; overdraftLimit: number; createdAt: Date }) {
    return {
        accountId:      a.accountId,
        ownerId:        a.ownerId,
        label:          a.label,
        currency:       a.currency,
        amount:         a.amount,
        overdraftLimit: a.overdraftLimit,
        createdAt:      a.createdAt,
    };
}

// POST /api/demurrage
// Body: { currency, rate, sinkAccountId, memo?, floor?, excludeAccountIds? }
export function applyDemurrage(req: Request, res: Response): void {
    const { currency, rate, sinkAccountId, memo, floor, excludeAccountIds } = req.body ?? {};
    if (!CURRENCIES.includes(currency)) {
        res.status(400).json({ error: `currency must be one of: ${CURRENCIES.join(", ")}` }); return;
    }
    if (typeof rate !== "number" || rate <= 0 || rate >= 1) {
        res.status(400).json({ error: "rate must be a number between 0 and 1 (exclusive)" }); return;
    }
    if (typeof sinkAccountId !== "string" || !sinkAccountId) {
        res.status(400).json({ error: "sinkAccountId is required" }); return;
    }
    if (memo !== undefined && typeof memo !== "string") {
        res.status(400).json({ error: "memo must be a string" }); return;
    }
    if (floor !== undefined && typeof floor !== "number") {
        res.status(400).json({ error: "floor must be a number" }); return;
    }
    if (excludeAccountIds !== undefined && !Array.isArray(excludeAccountIds)) {
        res.status(400).json({ error: "excludeAccountIds must be an array" }); return;
    }
    try {
        const txs = bank().applyDemurrage(
            currency as Currency, rate, sinkAccountId,
            memo ?? "demurrage",
            floor ?? 0,
            excludeAccountIds ?? [],
        );
        res.status(201).json({ count: txs.length, transactions: txs.map(toTxDto) });
    } catch (err) {
        res.status(422).json({ error: (err as Error).message });
    }
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
