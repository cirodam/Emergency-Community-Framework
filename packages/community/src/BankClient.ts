/**
 * HTTP client for all bank interactions.
 * The community node never imports @ecf/bank directly — all bank
 * interactions go through this client.
 */
export class BankClient {
    private readonly baseUrl: string;

    constructor(bankUrl: string) {
        // Trim trailing slash for consistent URL construction
        this.baseUrl = bankUrl.replace(/\/$/, "");
    }

    getPrimaryAccount(ownerId: string): { id: string; kin: number } | undefined {
        throw new Error(
            "BankClient.getPrimaryAccount is synchronous but the underlying call is async. " +
            "Use getPrimaryAccountAsync instead."
        );
    }

    async getPrimaryAccountAsync(ownerId: string): Promise<{ accountId: string; currency: string; amount: number } | undefined> {
        const res = await fetch(`${this.baseUrl}/api/accounts/${encodeURIComponent(ownerId)}`);
        if (res.status === 404) return undefined;
        if (!res.ok) throw new Error(`[BankClient] getAccounts(${ownerId}) failed: ${res.status}`);
        const accounts = (await res.json()) as { accountId: string; currency: string; amount: number; label: string }[];
        return accounts.find(a => a.label === "primary") ?? accounts[0];
    }

    async openAccount(ownerId: string, ownerName: string, currency: "kin" | "kithe" = "kin"): Promise<{ accountId: string; currency: string; amount: number }> {
        const res = await fetch(`${this.baseUrl}/api/accounts`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ownerId, ownerName, currency }),
        });
        if (!res.ok) throw new Error(`[BankClient] openAccount(${ownerId}) failed: ${res.status}`);
        return res.json() as Promise<{ accountId: string; currency: string; amount: number }>;
    }

    async transfer(
        fromId: string,
        toId: string,
        amount: number,
        memo: string,
    ): Promise<void> {
        const res = await fetch(`${this.baseUrl}/api/transfers`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fromAccountId: fromId, toAccountId: toId, amount, memo }),
        });
        if (!res.ok) {
            const body = await res.text();
            throw new Error(`[BankClient] transfer failed: ${res.status} ${body}`);
        }
    }
}
