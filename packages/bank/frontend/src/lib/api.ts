// Typed API wrappers for the bank backend.
// All calls use relative URLs — Vite proxies /api → http://localhost:3001 in dev,
// and the Express server serves the built frontend directly in production.

import { getToken, session } from "./session.js";

/**
 * Authenticated fetch — attaches the Bearer credential token when present.
 * On 401, clears the local session so the app re-routes to login.
 */
async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
    const token = getToken();
    const headers = new Headers(init.headers as HeadersInit);
    headers.set("Content-Type", "application/json");
    if (token) headers.set("Authorization", `Bearer ${token}`);
    const res = await fetch(input, { ...init, headers });
    if (res.status === 401) {
        session.logout();
    }
    return res;
}

export interface AccountDto {
    accountId: string;
    ownerId: string;
    label: string;
    currency: string;
    amount: number;
    overdraftLimit: number;
    createdAt: string;
}

export interface TransactionDto {
    id: string;
    fromAccountId: string;
    toAccountId: string;
    currency: string;
    amount: number;
    memo: string;
    timestamp: string;
}

// ── Accounts ──────────────────────────────────────────────────────────────────

export async function getMyAccounts(): Promise<AccountDto[]> {
    const res = await apiFetch("/api/me/accounts");
    if (!res.ok) throw new Error("Failed to load accounts");
    return res.json() as Promise<AccountDto[]>;
}

export async function createMyAccount(label: string, currency = "kin"): Promise<AccountDto> {
    const res = await apiFetch("/api/me/accounts", {
        method: "POST",
        body: JSON.stringify({ label, currency }),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Failed to create account");
    }
    return res.json() as Promise<AccountDto>;
}

export async function deleteMyAccount(accountId: string): Promise<void> {
    const res = await apiFetch(`/api/me/accounts/${encodeURIComponent(accountId)}`, {
        method: "DELETE",
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Failed to delete account");
    }
}

export async function renameMyAccount(accountId: string, label: string): Promise<AccountDto> {
    const res = await apiFetch(`/api/me/accounts/${encodeURIComponent(accountId)}`, {
        method: "PATCH",
        body: JSON.stringify({ label }),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Failed to rename account");
    }
    return res.json() as Promise<AccountDto>;
}

export async function getAccountsByOwner(ownerId: string): Promise<AccountDto[]> {
    const res = await apiFetch(`/api/accounts/${encodeURIComponent(ownerId)}`);
    if (!res.ok) throw new Error("Failed to load accounts");
    return res.json() as Promise<AccountDto[]>;
}

export async function getAccountById(accountId: string): Promise<AccountDto> {
    const res = await apiFetch(`/api/account/${encodeURIComponent(accountId)}`);
    if (!res.ok) throw new Error("Account not found");
    return res.json() as Promise<AccountDto>;
}

// ── Transactions ──────────────────────────────────────────────────────────────

export async function getTransactions(accountId: string, month?: string): Promise<TransactionDto[]> {
    const url = month
        ? `/api/accounts/${encodeURIComponent(accountId)}/transactions?month=${encodeURIComponent(month)}`
        : `/api/accounts/${encodeURIComponent(accountId)}/transactions`;
    const res = await apiFetch(url);
    if (!res.ok) throw new Error("Failed to load transactions");
    return res.json() as Promise<TransactionDto[]>;
}

// ── Transfers ─────────────────────────────────────────────────────────────────

export async function sendTransfer(
    fromAccountId: string,
    toAccountId: string,
    amount: number,
    memo: string,
): Promise<TransactionDto> {
    const res = await apiFetch("/api/transfers", {
        method: "POST",
        body: JSON.stringify({ fromAccountId, toAccountId, amount, memo }),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Transfer failed");
    }
    return res.json() as Promise<TransactionDto>;
}
