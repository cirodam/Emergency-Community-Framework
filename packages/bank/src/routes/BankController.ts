import { Request, Response } from "express";
import { Bank } from "../Bank.js";
import { Currency } from "../BankTransaction.js";
import { IEconomicActor } from "@ecf/core";

const CURRENCIES: Currency[] = ["kin", "kithe"];
const COMMUNITY_URL = process.env.COMMUNITY_URL ?? "http://localhost:3002";

const bank = () => Bank.getInstance();

// POST /api/accounts
// Body: { ownerId, ownerName, currency, label?, overdraftLimit?, handle?, primary? }
export function createAccount(req: Request, res: Response): void {
    const { ownerId, ownerName, currency, label, overdraftLimit, handle, primary } = req.body ?? {};
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
    const resolvedHandle = typeof handle === "string" && handle.trim()
        ? handle.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_")
        : (label ?? "primary").toLowerCase().replace(/[^a-z0-9_]/g, "_");
    const account = bank().openAccount(
        owner,
        label ?? "primary",
        currency as Currency,
        resolvedOverdraft,
        resolvedHandle,
        primary === true,
    );
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
    // Deduplicate by handle — keep the primary one if there are dupes (can happen if bank
    // access was revoked and re-granted before the idempotency check was in place)
    const seen = new Map<string, ReturnType<typeof toMemberAccountDto>>();
    for (const a of accounts) {
        const dto = toMemberAccountDto(a);
        const existing = seen.get(dto.handle);
        if (!existing || dto.primary) seen.set(dto.handle, dto);
    }
    res.json([...seen.values()]);
}

// GET /api/me/accounts/:handle — single account by handle
export function getMyAccountByHandle(req: Request & { personId?: string }, res: Response): void {
    const personId = req.personId;
    if (!personId) { res.status(401).json({ error: "Not authenticated" }); return; }
    const { handle } = req.params as { handle: string };
    const account = handle === "primary"
        ? bank().getPrimaryAccount(personId)
        : bank().getAccountByHandle(personId, handle);
    if (!account) { res.status(404).json({ error: "Account not found" }); return; }
    res.json(toMemberAccountDto(account));
}

// GET /api/me/accounts/:handle/transactions
export function getMyAccountTransactions(req: Request & { personId?: string }, res: Response): void {
    const personId = req.personId;
    if (!personId) { res.status(401).json({ error: "Not authenticated" }); return; }
    const { handle } = req.params as { handle: string };
    const account = handle === "primary"
        ? bank().getPrimaryAccount(personId)
        : bank().getAccountByHandle(personId, handle);
    if (!account) { res.status(404).json({ error: "Account not found" }); return; }
    const { month } = req.query;
    if (month !== undefined && (typeof month !== "string" || !/^\d{4}-\d{2}$/.test(month))) {
        res.status(400).json({ error: "month must be in YYYY-MM format" }); return;
    }
    const txs = bank().getTransactions(account.accountId, month as string | undefined);
    res.json(txs.map(toTxDto));
}

// GET /api/accounts/:ownerId
export function getAccounts(req: Request & { personId?: string }, res: Response): void {
    const requestedOwner = req.params.ownerId as string;
    // When called by a person credential, they may only fetch their own accounts
    if (req.personId && req.personId !== requestedOwner) {
        res.status(403).json({ error: "Forbidden" });
        return;
    }
    const accounts = bank().getAccounts(requestedOwner);
    if (accounts.length === 0) {
        res.status(404).json({ error: "No accounts found for owner" });
        return;
    }
    res.json(accounts.map(toAccountDto));
}

// GET /api/account/:accountId
export function getAccountById(req: Request & { personId?: string }, res: Response): void {
    const account = bank().getAccount(req.params.accountId as string);
    if (!account) {
        res.status(404).json({ error: "Account not found" });
        return;
    }
    // When called by a person credential, enforce ownership
    if (req.personId && account.ownerId !== req.personId) {
        res.status(403).json({ error: "Forbidden" });
        return;
    }
    res.json(toAccountDto(account));
}

// GET /api/accounts/:accountId/transactions?month=YYYY-MM
export function getTransactions(req: Request & { personId?: string }, res: Response): void {
    const accountId = req.params.accountId as string;
    const account = bank().getAccount(accountId);
    if (!account) {
        res.status(404).json({ error: "Account not found" });
        return;
    }
    // When called by a person credential, enforce ownership
    if (req.personId && account.ownerId !== req.personId) {
        res.status(403).json({ error: "Forbidden" });
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
export async function createTransfer(req: Request & { personId?: string }, res: Response): Promise<void> {
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

    // When called by a person credential, they may only transfer from their own account
    if (req.personId) {
        const fromAccount = bank().getAccount(fromAccountId);
        if (!fromAccount || fromAccount.ownerId !== req.personId) {
            res.status(403).json({ error: "Forbidden" });
            return;
        }
    }

    try {
        const tx = await bank().transfer(fromAccountId, toAccountId, amount, memo ?? "");
        res.status(201).json(toTxDto(tx));
    } catch (err) {
        res.status(422).json({ error: (err as Error).message });
    }
}

/** Member-facing DTO — no accountId UUID exposed. */
function toMemberAccountDto(a: { label: string; handle: string; primary: boolean; currency: string; amount: number; overdraftLimit: number; createdAt: Date }) {
    return {
        label:          a.label,
        handle:         a.handle,
        primary:        a.primary,
        currency:       a.currency,
        amount:         a.amount,
        overdraftLimit: a.overdraftLimit,
        createdAt:      a.createdAt,
    };
}

function toAccountDto(a: { accountId: string; ownerId: string; label: string; currency: string; amount: number; overdraftLimit: number; createdAt: Date; handle: string; primary: boolean }) {
    return {
        accountId:      a.accountId,
        ownerId:        a.ownerId,
        label:          a.label,
        handle:         a.handle,
        primary:        a.primary,
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

function toTxDto(t: { id: string; fromAccountId: string; toAccountId: string; currency: Currency; amount: number; memo: string; timestamp: Date; reversalOf?: string }) {
    // Resolve account IDs to handles for external display
    const fromAccount = bank().getAccount(t.fromAccountId);
    const toAccount   = bank().getAccount(t.toAccountId);
    return {
        id:        t.id,
        from:      fromAccount?.handle || "unknown",
        to:        toAccount?.handle   || "unknown",
        currency:  t.currency,
        amount:    t.amount,
        memo:      t.memo,
        timestamp: t.timestamp,
        reversalOf: t.reversalOf,
    };
}

const MAX_ACCOUNTS_PER_MEMBER = 10;

// GET /api/admin/accounts — requires teller or admin credential
export function adminGetAccounts(_req: Request, res: Response): void {
    res.json(bank().getAllAccounts().map(toAccountDto));
}

// POST /api/admin/transactions/:id/reverse — requires bank admin credential
// Body (optional): { memo }
export async function adminReverseTransaction(req: Request, res: Response): Promise<void> {
    const txId = req.params.id as string;
    const { memo } = req.body ?? {};
    if (memo !== undefined && typeof memo !== "string") {
        res.status(400).json({ error: "memo must be a string" }); return;
    }
    try {
        const reversal = await bank().reverseTransaction(txId, memo);
        res.status(201).json(toTxDto(reversal));
    } catch (err) {
        res.status(422).json({ error: (err as Error).message });
    }
}

// POST /api/me/accounts
// Body: { label, handle?, currency? }
// Creates a new personal account (up to MAX_ACCOUNTS_PER_MEMBER).
export function createMyAccount(req: Request & { personId?: string }, res: Response): void {
    const personId = req.personId;
    if (!personId) { res.status(401).json({ error: "Not authenticated" }); return; }

    const { label, handle, currency } = req.body ?? {};
    if (typeof label !== "string" || !label.trim()) {
        res.status(400).json({ error: "label is required" }); return;
    }
    const cur: Currency = CURRENCIES.includes(currency) ? currency as Currency : "kin";

    const existing = bank().getAccounts(personId);
    if (existing.length >= MAX_ACCOUNTS_PER_MEMBER) {
        res.status(422).json({ error: `Maximum of ${MAX_ACCOUNTS_PER_MEMBER} accounts per member` }); return;
    }

    const resolvedHandle = typeof handle === "string" && handle.trim()
        ? handle.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_")
        : label.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");

    if (existing.some(a => a.handle === resolvedHandle)) {
        res.status(409).json({ error: `You already have an account with handle "${resolvedHandle}"` }); return;
    }

    const owner: IEconomicActor = {
        getId:          () => personId,
        getDisplayName: () => personId,
        getHandle:      () => personId,
    };
    const account = bank().openAccount(owner, label.trim(), cur, 0, resolvedHandle, false);
    res.status(201).json(toMemberAccountDto(account));
}

// DELETE /api/accounts/:ownerId/all
// Closes all accounts for an owner. Requires all balances to be zero.
// Node-auth only — used by the community node during member discharge.
export function closeOwnerAccounts(req: Request, res: Response): void {
    const { ownerId } = req.params as { ownerId: string };
    try {
        bank().closeAccounts(ownerId);
        res.status(204).end();
    } catch (err) {
        res.status(422).json({ error: (err as Error).message });
    }
}

// DELETE /api/me/accounts/:accountId
// Closes the account by UUID. Kept for backwards-compat with node callers.
export function deleteMyAccount(req: Request & { personId?: string }, res: Response): void {
    const personId = req.personId;
    if (!personId) { res.status(401).json({ error: "Not authenticated" }); return; }

    const { accountId } = req.params as { accountId: string };
    const account = bank().getAccount(accountId);
    if (!account) { res.status(404).json({ error: "Account not found" }); return; }
    if (account.ownerId !== personId) { res.status(403).json({ error: "Forbidden" }); return; }

    const ownerAccounts = bank().getAccounts(personId);
    if (ownerAccounts.length <= 1) {
        res.status(422).json({ error: "Cannot delete your only account" }); return;
    }

    try {
        bank().closeAccount(accountId);
        res.status(204).end();
    } catch (err) {
        res.status(422).json({ error: (err as Error).message });
    }
}

// PATCH /api/me/accounts/:accountId
// Body: { label }
// Renames the account.
export function renameMyAccount(req: Request & { personId?: string }, res: Response): void {
    const personId = req.personId;
    if (!personId) { res.status(401).json({ error: "Not authenticated" }); return; }

    const { accountId } = req.params as { accountId: string };
    const account = bank().getAccount(accountId);
    if (!account) { res.status(404).json({ error: "Account not found" }); return; }
    if (account.ownerId !== personId) { res.status(403).json({ error: "Forbidden" }); return; }

    const { label } = req.body ?? {};
    if (typeof label !== "string" || !label.trim()) {
        res.status(400).json({ error: "label is required" }); return;
    }

    const updated = bank().renameAccount(accountId, label.trim());
    res.json(toMemberAccountDto(updated));
}

// DELETE /api/me/accounts/by-handle/:handle
export function deleteMyAccountByHandle(req: Request & { personId?: string }, res: Response): void {
    const personId = req.personId;
    if (!personId) { res.status(401).json({ error: "Not authenticated" }); return; }
    const { handle } = req.params as { handle: string };
    const account = bank().getAccountByHandle(personId, handle);
    if (!account) { res.status(404).json({ error: "Account not found" }); return; }
    const ownerAccounts = bank().getAccounts(personId);
    if (ownerAccounts.length <= 1) {
        res.status(422).json({ error: "Cannot delete your only account" }); return;
    }
    try {
        bank().closeAccount(account.accountId);
        res.status(204).end();
    } catch (err) {
        res.status(422).json({ error: (err as Error).message });
    }
}

// PATCH /api/me/accounts/by-handle/:handle
// Body: { label }
export function renameMyAccountByHandle(req: Request & { personId?: string }, res: Response): void {
    const personId = req.personId;
    if (!personId) { res.status(401).json({ error: "Not authenticated" }); return; }
    const { handle } = req.params as { handle: string };
    const account = bank().getAccountByHandle(personId, handle);
    if (!account) { res.status(404).json({ error: "Account not found" }); return; }
    const { label } = req.body ?? {};
    if (typeof label !== "string" || !label.trim()) {
        res.status(400).json({ error: "label is required" }); return;
    }
    const updated = bank().renameAccount(account.accountId, label.trim());
    res.json(toMemberAccountDto(updated));
}

// ── Community proxy routes ─────────────────────────────────────────────────────

// GET /api/persons — proxy to community service for autocomplete
export async function listPersons(req: Request, res: Response): Promise<void> {
    const authHeader = req.headers.authorization;
    if (!authHeader) { res.status(401).json({ error: "Not authenticated" }); return; }
    try {
        const upstream = await fetch(`${COMMUNITY_URL}/api/persons`, {
            headers: { Authorization: authHeader },
        });
        const data = await upstream.json();
        res.status(upstream.status).json(data);
    } catch {
        res.status(502).json({ error: "Could not reach community service" });
    }
}

// POST /api/transfers/send — proxy to community service for handle-based transfers
export async function sendTransferByHandle(req: Request, res: Response): Promise<void> {
    const authHeader = req.headers.authorization;
    if (!authHeader) { res.status(401).json({ error: "Not authenticated" }); return; }
    try {
        const body = JSON.stringify(req.body ?? {});
        const upstream = await fetch(`${COMMUNITY_URL}/api/transfers/send`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: authHeader },
            body,
        });
        const data = await upstream.json();
        res.status(upstream.status).json(data);
    } catch {
        res.status(502).json({ error: "Could not reach community service" });
    }
}
