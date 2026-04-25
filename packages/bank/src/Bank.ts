import { IEconomicActor } from "@ecf/core";
import { BankAccount } from "./BankAccount.js";
import { AccountLoader } from "./AccountLoader.js";
import { BankTransaction, Currency } from "./BankTransaction.js";
import { TransactionLoader } from "./TransactionLoader.js";

/**
 * Pure infrastructure singleton that owns all account balances and transaction history.
 *
 * All value movement must go through transfer(). There is no direct balance mutation.
 * The bank has no opinion about who its account holders are — members, communities,
 * scheduled processes all look the same.
 */
export class Bank {
    private static instance: Bank;

    private accounts: Map<string, BankAccount> = new Map();
    private ownerIndex: Map<string, string[]> = new Map();
    private accountLoader: AccountLoader | null = null;
    private transactionLoader: TransactionLoader | null = null;

    private constructor() {}

    static getInstance(): Bank {
        if (!Bank.instance) Bank.instance = new Bank();
        return Bank.instance;
    }

    /**
     * Attach persistence layers and hydrate the in-memory account map from disk.
     * Must be called exactly once at startup before any other method.
     */
    init(accountLoader: AccountLoader, transactionLoader: TransactionLoader): void {
        this.accountLoader = accountLoader;
        this.transactionLoader = transactionLoader;
        for (const account of accountLoader.loadAll()) {
            this.accounts.set(account.id, account);
            const list = this.ownerIndex.get(account.ownerId) ?? [];
            list.push(account.id);
            this.ownerIndex.set(account.ownerId, list);
        }
    }

    // ── Account management ────────────────────────────────────────────────────

    openAccount(owner: IEconomicActor, label: string, overdraftLimit: number = 0, exemptFromDemurrage: boolean = false): BankAccount {
        const account = new BankAccount(owner, label, overdraftLimit, exemptFromDemurrage);
        this.accounts.set(account.id, account);

        const ownerAccounts = this.ownerIndex.get(owner.getId()) ?? [];
        ownerAccounts.push(account.id);
        this.ownerIndex.set(owner.getId(), ownerAccounts);
        this.accountLoader?.save(account);

        return account;
    }

    getAccount(accountId: string): BankAccount | undefined {
        return this.accounts.get(accountId);
    }

    getAccounts(ownerId: string): BankAccount[] {
        const ids = this.ownerIndex.get(ownerId) ?? [];
        return ids.map(id => this.accounts.get(id)!);
    }

    getPrimaryAccount(ownerId: string): BankAccount | undefined {
        return this.getAccounts(ownerId).find(a => a.label === "primary");
    }

    getAllAccounts(): BankAccount[] {
        return Array.from(this.accounts.values());
    }

    closeAccounts(ownerId: string): void {
        const ids = this.ownerIndex.get(ownerId) ?? [];
        for (const id of ids) {
            const account = this.accounts.get(id);
            if (account && account.kin !== 0) {
                throw new Error(
                    `Cannot close account ${id} (label: "${account.label}") for owner ${ownerId}: balance is ${account.kin}`
                );
            }
        }
        for (const id of ids) {
            this.accounts.delete(id);
            this.accountLoader?.delete(id);
        }
        this.ownerIndex.delete(ownerId);
    }

    // ── Transfers ─────────────────────────────────────────────────────────────

    transfer(
        fromAccountId: string,
        toAccountId: string,
        currency: Currency,
        amount: number,
        memo: string = ""
    ): BankTransaction {
        if (!Number.isFinite(amount) || amount <= 0) {
            throw new Error(`Transfer amount must be a finite positive number, got ${amount}`);
        }

        const from = this.accounts.get(fromAccountId);
        const to = this.accounts.get(toAccountId);
        if (!from) throw new Error(`Account ${fromAccountId} not found`);
        if (!to) throw new Error(`Account ${toAccountId} not found`);

        if (from.kin - amount < from.overdraftLimit) {
            throw new Error(
                `Insufficient funds: account ${fromAccountId} has ${from.kin}, limit ${from.overdraftLimit}, attempted ${amount}`
            );
        }

        from.debit(amount);
        to.credit(amount);

        const tx = new BankTransaction(fromAccountId, toAccountId, currency, amount, memo);
        this.accountLoader?.save(from);
        this.accountLoader?.save(to);
        this.transactionLoader?.save(tx);
        return tx;
    }

    // ── Transaction history ───────────────────────────────────────────────────

    getTransactions(accountId?: string, month?: string): BankTransaction[] {
        return this.transactionLoader?.query({ accountId, month }) ?? [];
    }
}
