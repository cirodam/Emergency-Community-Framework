/**
 * HTTP client for all bank interactions.
 * The community node never imports @ecf/bank directly — all bank
 * interactions go through this client.
 *
 * Pass a `sign` function (from NodeSigner.signBody) to authenticate
 * mutation requests as the community node. The bank verifies the
 * x-node-signature header and accepts it in place of a PersonCredential.
 */
export class BankClient {
    private readonly baseUrl: string;
    private readonly sign: ((body: string) => string) | null;

    constructor(bankUrl: string, sign: ((body: string) => string) | null = null) {
        // Trim trailing slash for consistent URL construction
        this.baseUrl = bankUrl.replace(/\/$/, "");
        this.sign = sign;
    }

    /** Build headers for a signed POST request. */
    private signedHeaders(body: string): Record<string, string> {
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (this.sign) headers["x-node-signature"] = this.sign(body);
        return headers;
    }

    /** Build headers for a signed GET request (body is empty string). */
    private signedGetHeaders(): Record<string, string> {
        const headers: Record<string, string> = {};
        if (this.sign) headers["x-node-signature"] = this.sign("");
        return headers;
    }

    getPrimaryAccount(ownerId: string): { id: string; kin: number } | undefined {
        throw new Error(
            "BankClient.getPrimaryAccount is synchronous but the underlying call is async. " +
            "Use getPrimaryAccountAsync instead."
        );
    }

    async getPrimaryAccountAsync(ownerId: string): Promise<{ accountId: string; currency: string; amount: number } | undefined> {
        const res = await fetch(`${this.baseUrl}/api/accounts/${encodeURIComponent(ownerId)}`, {
            headers: this.signedGetHeaders(),
        });
        if (res.status === 404) return undefined;
        if (!res.ok) throw new Error(`[BankClient] getAccounts(${ownerId}) failed: ${res.status}`);
        const accounts = (await res.json()) as { accountId: string; currency: string; amount: number; label: string }[];
        return accounts.find(a => a.label === "primary") ?? accounts[0];
    }

    async getAccountById(accountId: string): Promise<{ accountId: string; currency: string; amount: number } | undefined> {
        const res = await fetch(`${this.baseUrl}/api/account/${encodeURIComponent(accountId)}`, {
            headers: this.signedGetHeaders(),
        });
        if (res.status === 404) return undefined;
        if (!res.ok) throw new Error(`[BankClient] getAccountById(${accountId}) failed: ${res.status}`);
        return res.json() as Promise<{ accountId: string; currency: string; amount: number }>;
    }

    async openAccount(
        ownerId: string,
        ownerName: string,
        currency: "kin" | "kithe" = "kin",
        overdraftLimit: number | null = 0,
    ): Promise<{ accountId: string; currency: string; amount: number }> {
        const body = JSON.stringify({ ownerId, ownerName, currency, overdraftLimit });
        const res = await fetch(`${this.baseUrl}/api/accounts`, {
            method: "POST",
            headers: this.signedHeaders(body),
            body,
        });
        if (!res.ok) throw new Error(`[BankClient] openAccount(${ownerId}) failed: ${res.status}`);
        return res.json() as Promise<{ accountId: string; currency: string; amount: number }>;
    }

    async createOwner(
        ownerType: "person" | "institution",
        displayName: string,
        options?: { phone?: string; publicKeyHex?: string; ownerId?: string },
    ): Promise<{ ownerId: string; ownerType: string; displayName: string }> {
        const body = JSON.stringify({ ownerType, displayName, ...options });
        const res = await fetch(`${this.baseUrl}/api/owners`, {
            method: "POST",
            headers: this.signedHeaders(body),
            body,
        });
        if (!res.ok) throw new Error(`[BankClient] createOwner(${displayName}) failed: ${res.status}`);
        return res.json() as Promise<{ ownerId: string; ownerType: string; displayName: string }>;
    }

    async applyDemurrage(
        currency: "kin" | "kithe",
        rate: number,
        sinkAccountId: string,
        memo = "demurrage",
        floor = 0,
        excludeAccountIds: string[] = [],
    ): Promise<{ count: number }> {
        const body = JSON.stringify({ currency, rate, sinkAccountId, memo, floor, excludeAccountIds });
        const res = await fetch(`${this.baseUrl}/api/demurrage`, {
            method: "POST",
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
        toId: string,
        amount: number,
        memo: string,
    ): Promise<void> {
        const body = JSON.stringify({ fromAccountId: fromId, toAccountId: toId, amount, memo });
        const res = await fetch(`${this.baseUrl}/api/transfers`, {
            method: "POST",
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
            method: "DELETE",
            headers: this.signedGetHeaders(),
        });
        if (!res.ok) {
            const text = await res.text();
            throw new Error(`[BankClient] closeAccounts(${ownerId}) failed: ${res.status} ${text}`);
        }
    }
}
