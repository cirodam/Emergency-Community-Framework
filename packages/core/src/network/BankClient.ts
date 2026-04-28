/**
 * Shared HTTP client for all bank interactions across the ECF hierarchy.
 *
 * @param bankUrl         Base URL of the bank server.
 * @param sign            Signs a request body with the node's Ed25519 key.
 *                        Pass null for unauthenticated read-only usage.
 * @param defaultCurrency Currency to use when openAccount is called without
 *                        an explicit currency argument. Defaults to "kin"
 *                        (community layer). Upper layers pass "kithe".
 */
export class BankClient {
    private readonly baseUrl:   string;
    private readonly sign:      ((body: string) => string) | null;
    private readonly defaultCurrency: "kin" | "kithe";

    constructor(
        bankUrl:         string,
        sign:            ((body: string) => string) | null = null,
        defaultCurrency: "kin" | "kithe" = "kin",
    ) {
        this.baseUrl         = bankUrl.replace(/\/$/, "");
        this.sign            = sign;
        this.defaultCurrency = defaultCurrency;
    }

    private signedHeaders(body: string): Record<string, string> {
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (this.sign) headers["x-node-signature"] = this.sign(body);
        return headers;
    }

    private signedGetHeaders(): Record<string, string> {
        const headers: Record<string, string> = {};
        if (this.sign) headers["x-node-signature"] = this.sign("");
        return headers;
    }

    async getPrimaryAccountAsync(
        ownerId: string,
    ): Promise<{ accountId: string; currency: string; amount: number } | undefined> {
        const res = await fetch(`${this.baseUrl}/api/accounts/${encodeURIComponent(ownerId)}`, {
            headers: this.signedGetHeaders(),
        });
        if (res.status === 404) return undefined;
        if (!res.ok) throw new Error(`[BankClient] getAccounts(${ownerId}) failed: ${res.status}`);
        const accounts = (await res.json()) as { accountId: string; currency: string; amount: number; label: string }[];
        return accounts.find(a => a.label === "primary") ?? accounts[0];
    }

    async getAccountById(
        accountId: string,
    ): Promise<{ accountId: string; currency: string; amount: number } | undefined> {
        const res = await fetch(`${this.baseUrl}/api/account/${encodeURIComponent(accountId)}`, {
            headers: this.signedGetHeaders(),
        });
        if (res.status === 404) return undefined;
        if (!res.ok) throw new Error(`[BankClient] getAccountById(${accountId}) failed: ${res.status}`);
        return res.json() as Promise<{ accountId: string; currency: string; amount: number }>;
    }

    async openAccount(
        ownerId:       string,
        ownerName:     string,
        currency:      "kin" | "kithe" = this.defaultCurrency,
        overdraftLimit: number | null  = 0,
    ): Promise<{ accountId: string; currency: string; amount: number }> {
        const body = JSON.stringify({ ownerId, ownerName, currency, overdraftLimit });
        const res  = await fetch(`${this.baseUrl}/api/accounts`, {
            method:  "POST",
            headers: this.signedHeaders(body),
            body,
        });
        if (!res.ok) throw new Error(`[BankClient] openAccount(${ownerId}) failed: ${res.status}`);
        return res.json() as Promise<{ accountId: string; currency: string; amount: number }>;
    }

    async createOwner(
        ownerType:   "person" | "institution",
        displayName: string,
        options?:    { phone?: string; publicKeyHex?: string; ownerId?: string },
    ): Promise<{ ownerId: string; ownerType: string; displayName: string }> {
        const body = JSON.stringify({ ownerType, displayName, ...options });
        const res  = await fetch(`${this.baseUrl}/api/owners`, {
            method:  "POST",
            headers: this.signedHeaders(body),
            body,
        });
        if (!res.ok) throw new Error(`[BankClient] createOwner(${displayName}) failed: ${res.status}`);
        return res.json() as Promise<{ ownerId: string; ownerType: string; displayName: string }>;
    }

    async applyDemurrage(
        currency:          "kin" | "kithe",
        rate:              number,
        sinkAccountId:     string,
        memo               = "demurrage",
        floor              = 0,
        excludeAccountIds: string[] = [],
    ): Promise<{ count: number }> {
        const body = JSON.stringify({ currency, rate, sinkAccountId, memo, floor, excludeAccountIds });
        const res  = await fetch(`${this.baseUrl}/api/demurrage`, {
            method:  "POST",
            headers: this.signedHeaders(body),
            body,
        });
        if (!res.ok) {
            const text = await res.text();
            throw new Error(`[BankClient] applyDemurrage failed: ${res.status} ${text}`);
        }
        return res.json() as Promise<{ count: number }>;
    }

    async transfer(
        fromId: string,
        toId:   string,
        amount: number,
        memo:   string,
    ): Promise<void> {
        const body = JSON.stringify({ fromAccountId: fromId, toAccountId: toId, amount, memo });
        const res  = await fetch(`${this.baseUrl}/api/transfers`, {
            method:  "POST",
            headers: this.signedHeaders(body),
            body,
        });
        if (!res.ok) {
            const text = await res.text();
            throw new Error(`[BankClient] transfer failed: ${res.status} ${text}`);
        }
    }

    async closeAccounts(ownerId: string): Promise<void> {
        const res = await fetch(`${this.baseUrl}/api/accounts/${encodeURIComponent(ownerId)}/all`, {
            method:  "DELETE",
            headers: this.signedGetHeaders(),
        });
        if (!res.ok) {
            const text = await res.text();
            throw new Error(`[BankClient] closeAccounts(${ownerId}) failed: ${res.status} ${text}`);
        }
    }
}
