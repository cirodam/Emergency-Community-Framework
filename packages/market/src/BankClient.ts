/**
 * Minimal HTTP client for bank interactions needed by the market node.
 *
 * Mutations are signed with the market node's Ed25519 key so the bank
 * accepts them as institutional (node-signature) requests rather than
 * requiring a PersonCredential.
 */
export class BankClient {
    private readonly baseUrl: string;
    private readonly sign: (body: string) => string;

    constructor(bankUrl: string, sign: (body: string) => string) {
        this.baseUrl = bankUrl.replace(/\/$/, "");
        this.sign    = sign;
    }

    private signedHeaders(body: string): Record<string, string> {
        return {
            "Content-Type":     "application/json",
            "x-node-signature": this.sign(body),
        };
    }

    async getPrimaryAccountAsync(
        ownerId: string,
    ): Promise<{ accountId: string; currency: string; amount: number } | undefined> {
        const res = await fetch(`${this.baseUrl}/api/accounts/${encodeURIComponent(ownerId)}`);
        if (res.status === 404) return undefined;
        if (!res.ok) throw new Error(`[market/bank] getAccounts(${ownerId}) failed: ${res.status}`);
        const accounts = (await res.json()) as { accountId: string; currency: string; amount: number; label: string }[];
        return accounts.find(a => a.label === "primary") ?? accounts[0];
    }

    async transfer(
        fromAccountId: string,
        toAccountId: string,
        amount: number,
        memo: string,
    ): Promise<void> {
        const body = JSON.stringify({ fromAccountId, toAccountId, amount, memo });
        const res = await fetch(`${this.baseUrl}/api/transfers`, {
            method:  "POST",
            headers: this.signedHeaders(body),
            body,
        });
        if (!res.ok) {
            const text = await res.text();
            throw new Error(`[market/bank] transfer failed: ${res.status} ${text}`);
        }
    }
}
