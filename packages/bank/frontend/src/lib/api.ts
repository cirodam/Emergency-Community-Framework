// Typed API wrappers for the bank backend.
// All calls use relative URLs — Vite proxies /api → http://localhost:3001 in dev,
// and the Express server serves the built frontend directly in production.

import { getToken } from "./session.js";

/**
 * Authenticated fetch — attaches the Bearer credential token when present.
 * Use for all calls that require a logged-in user.
 */
function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
    const token = getToken();
    const headers = new Headers(init.headers as HeadersInit);
    headers.set("Content-Type", "application/json");
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return fetch(input, { ...init, headers });
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

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface LoginResult {
    token: string;
    personId: string;
    handle: string;
    displayName: string;
    accounts: AccountDto[];
}

/**
 * Sign in via the community SSO. The bank backend proxies to community,
 * verifies the credential, and returns the token + accounts in one call.
 */
export async function login(handle: string, password: string): Promise<LoginResult> {
    const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle, password }),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Login failed");
    }
    return res.json() as Promise<LoginResult>;
}

// ── Accounts ──────────────────────────────────────────────────────────────────

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
