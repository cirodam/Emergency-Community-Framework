// Typed API wrappers for the bank backend.
// All calls use relative URLs — Vite proxies /api → http://localhost:3001 in dev,
// and the Express server serves the built frontend directly in production.

export interface OwnerDto {
    ownerId: string;
    ownerType: "person" | "institution";
    displayName: string;
    phone?: string;
    hasPassword: boolean;
    hasPin: boolean;
    createdAt: string;
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

export async function loginWithPin(phone: string, pin: string): Promise<OwnerDto> {
    const res = await fetch("/api/auth/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, pin }),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Login failed");
    }
    return res.json() as Promise<OwnerDto>;
}

export async function loginWithPassword(phone: string, password: string): Promise<OwnerDto> {
    const res = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password }),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Login failed");
    }
    return res.json() as Promise<OwnerDto>;
}

// ── Accounts ──────────────────────────────────────────────────────────────────

export async function getAccountsByOwner(ownerId: string): Promise<AccountDto[]> {
    const res = await fetch(`/api/accounts/${encodeURIComponent(ownerId)}`);
    if (!res.ok) throw new Error("Failed to load accounts");
    return res.json() as Promise<AccountDto[]>;
}

export async function getAccountById(accountId: string): Promise<AccountDto> {
    const res = await fetch(`/api/account/${encodeURIComponent(accountId)}`);
    if (!res.ok) throw new Error("Account not found");
    return res.json() as Promise<AccountDto>;
}

// ── Transactions ──────────────────────────────────────────────────────────────

export async function getTransactions(accountId: string, month?: string): Promise<TransactionDto[]> {
    const url = month
        ? `/api/accounts/${encodeURIComponent(accountId)}/transactions?month=${encodeURIComponent(month)}`
        : `/api/accounts/${encodeURIComponent(accountId)}/transactions`;
    const res = await fetch(url);
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
    const res = await fetch("/api/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromAccountId, toAccountId, amount, memo }),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Transfer failed");
    }
    return res.json() as Promise<TransactionDto>;
}

// ── Settings ──────────────────────────────────────────────────────────────────

export async function setPin(ownerId: string, pin: string): Promise<void> {
    const res = await fetch(`/api/owners/${encodeURIComponent(ownerId)}/pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Failed to set PIN");
    }
}

export async function setPassword(ownerId: string, password: string): Promise<void> {
    const res = await fetch(`/api/owners/${encodeURIComponent(ownerId)}/password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Failed to set password");
    }
}
