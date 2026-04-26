/**
 * HTTP client for all federation bank interactions.
 * All requests are signed with the federation node's Ed25519 key.
 */
export class BankClient {
    private readonly baseUrl: string;
    private readonly sign: (body: string) => string;

    constructor(bankUrl: string, sign: (body: string) => string) {
        this.baseUrl = bankUrl.replace(/\/$/, "");
        this.sign = sign;
    }

    private signedHeaders(body: string): Record<string, string> {
        return {
            "Content-Type":      "application/json",
            "x-node-signature":  this.sign(body),
        };
    }

    async getPrimaryAccountAsync(
        ownerId: string,
    ): Promise<{ accountId: string; currency: string; amount: number } | undefined> {
        const res = await fetch(`${this.baseUrl}/api/accounts/${encodeURIComponent(ownerId)}`);
        if (res.status === 404) return undefined;
        if (!res.ok) throw new Error(`[BankClient] getAccounts(${ownerId}) failed: ${res.status}`);
        const accounts = (await res.json()) as { accountId: string; currency: string; amount: number; label: string }[];
        return accounts.find(a => a.label === "primary") ?? accounts[0];
    }

    async getAccountById(
        accountId: string,
    ): Promise<{ accountId: string; currency: string; amount: number } | undefined> {
        const res = await fetch(`${this.baseUrl}/api/account/${encodeURIComponent(accountId)}`);
        if (res.status === 404) return undefined;
        if (!res.ok) throw new Error(`[BankClient] getAccountById(${accountId}) failed: ${res.status}`);
        return res.json() as Promise<{ accountId: string; currency: string; amount: number }>;
    }

    async openAccount(
        ownerId: string,
        ownerName: string,
        currency: "kin" | "kithe" = "kithe",
        overdraftLimit: number | null = 0,
    ): Promise<{ accountId: string; currency: string; amount: number }> {
        const body = JSON.stringify({ ownerId, ownerName, currency, overdraftLimit });
        const res = await fetch(`${this.baseUrl}/api/accounts`, {
            method:  "POST",
            headers: this.signedHeaders(body),
            body,
        });
        if (!res.ok) throw new Error(`[BankClient] openAccount(${ownerId}) failed: ${res.status}`);
        return res.json() as Promise<{ accountId: string; currency: string; amount: number }>;
    }

    async createOwner(
        ownerType: "person" | "institution",
        displayName: string,
        options?: { ownerId?: string },
    ): Promise<{ ownerId: string; ownerType: string; displayName: string }> {
        const body = JSON.stringify({ ownerType, displayName, ...options });
        const res = await fetch(`${this.baseUrl}/api/owners`, {
            method:  "POST",
            headers: this.signedHeaders(body),
            body,
        });
        if (!res.ok) throw new Error(`[BankClient] createOwner(${displayName}) failed: ${res.status}`);
        return res.json() as Promise<{ ownerId: string; ownerType: string; displayName: string }>;
    }

    async applyDemurrage(
        rate: number,
        sinkAccountId: string,
        memo = "kithe demurrage",
        floor = 0,
        excludeAccountIds: string[] = [],
    ): Promise<{ count: number }> {
        const body = JSON.stringify({
            currency: "kithe",
            rate,
            sinkAccountId,
            memo,
            floor,
            excludeAccountIds,
        });
        const res = await fetch(`${this.baseUrl}/api/demurrage`, {
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
        toId: string,
        amount: number,
        memo: string,
    ): Promise<void> {
        const body = JSON.stringify({ fromAccountId: fromId, toAccountId: toId, amount, memo });
        const res = await fetch(`${this.baseUrl}/api/transfers`, {
            method:  "POST",
            headers: this.signedHeaders(body),
            body,
        });
        if (!res.ok) {
            const text = await res.text();
            throw new Error(`[BankClient] transfer failed: ${res.status} ${text}`);
        }
    }
}
