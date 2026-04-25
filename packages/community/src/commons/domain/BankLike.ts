/**
 * Minimal bank interface required for payroll and account queries.
 * BankClient will satisfy this shape once implemented.
 */
export interface BankLike {
    getPrimaryAccount(ownerId: string): { id: string; kin: number } | undefined;
    transfer(fromAccountId: string, toAccountId: string, currency: "kin" | "kithe", amount: number, memo: string): Promise<void>;
}
