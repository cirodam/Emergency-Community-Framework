import { IEconomicActor } from "@ecf/core";
import { BankAccount } from "./BankAccount.js";
import { AccountLoader } from "./AccountLoader.js";
import { BankTransaction, Currency } from "./BankTransaction.js";
import { TransactionLoader } from "./TransactionLoader.js";
import { BankDb } from "./BankDb.js";

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

    /**
     * Serial queue for external transfers. Ensures balance-check and debit are
     * atomic even if storage later becomes async. Each call to transfer() chains
     * onto this promise so concurrent HTTP requests are serialized.
     */
    private _txQueue: Promise<void> = Promise.resolve();

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
            this.accounts.set(account.accountId, account);
            const list = this.ownerIndex.get(account.ownerId) ?? [];
            list.push(account.accountId);
            this.ownerIndex.set(account.ownerId, list);
        }
    }

    // ── Account management ────────────────────────────────────────────────────

    openAccount(
        owner: IEconomicActor,
        label: string,
        currency: Currency,
        overdraftLimit: number = 0,
        handle: string = "",
        primary: boolean = false,
    ): BankAccount {
        // If this is the owner's first account, make it primary automatically
        const ownerAccounts = this.ownerIndex.get(owner.getId()) ?? [];
        const isFirst = ownerAccounts.length === 0;
        const account = new BankAccount(owner, label, currency, overdraftLimit, handle, primary || isFirst);
        this.accounts.set(account.accountId, account);

        ownerAccounts.push(account.accountId);
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
        const accounts = this.getAccounts(ownerId);
        return accounts.find(a => a.primary) ?? accounts[0];
    }

    getAccountByHandle(ownerId: string, handle: string): BankAccount | undefined {
        return this.getAccounts(ownerId).find(a => a.handle === handle);
    }

    getAllAccounts(): BankAccount[] {
        return Array.from(this.accounts.values());
    }

    closeAccounts(ownerId: string): void {
        const ids = this.ownerIndex.get(ownerId) ?? [];
        for (const id of ids) {
            const account = this.accounts.get(id);
            if (account && account.amount !== 0) {
                throw new Error(
                    `Cannot close account ${id} (label: "${account.label}") for owner ${ownerId}: balance is ${account.amount}`
                );
            }
        }
        for (const id of ids) {
            this.accounts.delete(id);
            this.accountLoader?.delete(id);
        }
        this.ownerIndex.delete(ownerId);
    }

    /** Close a single account. Throws if the balance is non-zero. */
    closeAccount(accountId: string): void {
        const account = this.accounts.get(accountId);
        if (!account) throw new Error(`Account ${accountId} not found`);
        if (account.amount !== 0) {
            throw new Error(
                `Cannot close account "${account.label}" (${accountId}): balance is ${account.amount}. Transfer funds away first.`
            );
        }
        this.accounts.delete(accountId);
        const ids = this.ownerIndex.get(account.ownerId) ?? [];
        this.ownerIndex.set(account.ownerId, ids.filter(id => id !== accountId));
        this.accountLoader?.delete(accountId);
    }

    /** Rename an account. Returns the updated account. */
    renameAccount(accountId: string, newLabel: string): BankAccount {
        const account = this.accounts.get(accountId);
        if (!account) throw new Error(`Account ${accountId} not found`);
        account.label = newLabel;
        this.accountLoader?.save(account);
        return account;
    }

    // ── Transfers ─────────────────────────────────────────────────────────────

    /**
     * Enqueue a transfer. Serialized via _txQueue so the balance check and debit
     * are always atomic — safe against concurrent HTTP requests and future async
     * storage backends.
     */
    transfer(
        fromAccountId: string,
        toAccountId: string,
        amount: number,
        memo: string = ""
    ): Promise<BankTransaction> {
        const result = this._txQueue.then(() =>
            this._transferSync(fromAccountId, toAccountId, amount, memo)
        );
        // Advance the queue; swallow errors so the queue never deadlocks
        this._txQueue = result.then(() => undefined, () => undefined);
        return result;
    }

    /** Synchronous core — called by the queue and internally by applyDemurrage. */
    private _transferSync(
        fromAccountId: string,
        toAccountId: string,
        amount: number,
        memo: string = "",
        reversalOf?: string,
    ): BankTransaction {
        if (!Number.isFinite(amount) || amount <= 0) {
            throw new Error(`Transfer amount must be a finite positive number, got ${amount}`);
        }

        const from = this.accounts.get(fromAccountId);
        const to = this.accounts.get(toAccountId);
        if (!from) throw new Error(`Account ${fromAccountId} not found`);
        if (!to)   throw new Error(`Account ${toAccountId} not found`);

        if (from.currency !== to.currency) {
            throw new Error(
                `Currency mismatch: account ${fromAccountId} is ${from.currency}, ` +
                `account ${toAccountId} is ${to.currency}`
            );
        }

        if (from.amount - amount < from.overdraftLimit) {
            throw new Error(
                `Insufficient funds: account ${from.accountId} has ${from.amount}, limit ${from.overdraftLimit}, attempted ${amount}`
            );
        }

        from.debit(amount);
        to.credit(amount);

        const tx = new BankTransaction(fromAccountId, toAccountId, from.currency, amount, memo, reversalOf);

        // Persist all three writes atomically so a crash mid-transfer can't
        // leave accounts and the ledger in an inconsistent state.
        BankDb.getInstance().db.transaction(() => {
            this.accountLoader?.save(from);
            this.accountLoader?.save(to);
            this.transactionLoader?.save(tx);
        })();

        return tx;
    }

    // ── Demurrage ─────────────────────────────────────────────────────────────

    /**
     * Charge a holding fee on every account in `currency` except the sink.
     *
     * `rate` is a fraction of the current balance, e.g. 0.02 = 2%.
     * `floor` (default 0) — the balance threshold below which no demurrage is
     *   charged. Only the portion of a balance above the floor is taxed. This
     *   protects small balances from erosion (see `demurrageFloor` in the
     *   Constitution).
     * `excludeAccountIds` — additional accounts to skip (e.g. the social
     *   insurance pool, which holds deferred liabilities, not circulating kin).
     * Accounts that cannot cover the full fee are charged only what is available
     * above their overdraft limit. Zero-balance accounts are skipped entirely.
     * Returns all generated transactions.
     */
    applyDemurrage(
        currency: Currency,
        rate: number,
        sinkAccountId: string,
        memo: string = "demurrage",
        floor: number = 0,
        excludeAccountIds: string[] = [],
    ): BankTransaction[] {
        if (!Number.isFinite(rate) || rate <= 0 || rate >= 1) {
            throw new Error(`Demurrage rate must be between 0 and 1 (exclusive), got ${rate}`);
        }
        const sink = this.accounts.get(sinkAccountId);
        if (!sink) throw new Error(`Sink account ${sinkAccountId} not found`);
        if (sink.currency !== currency) {
            throw new Error(`Sink account currency ${sink.currency} does not match demurrage currency ${currency}`);
        }

        const excluded = new Set([sinkAccountId, ...excludeAccountIds]);

        const txs: BankTransaction[] = [];
        for (const account of this.accounts.values()) {
            if (account.currency !== currency) continue;
            if (excluded.has(account.accountId)) continue;
            if (account.amount <= 0) continue;

            const taxable    = Math.max(0, account.amount - floor);
            const fullFee    = Math.round(taxable * rate * 100) / 100;
            const headroom   = Math.round((account.amount - account.overdraftLimit) * 100) / 100;
            const chargeable = Math.min(fullFee, headroom);
            if (chargeable <= 0) continue;

            txs.push(this._transferSync(account.accountId, sinkAccountId, chargeable, memo));
        }
        return txs;
    }

    // ── Transaction history ───────────────────────────────────────────────────

    getTransactions(accountId?: string, month?: string): BankTransaction[] {
        return this.transactionLoader?.query({ accountId, month }) ?? [];
    }

    getTransaction(txId: string): BankTransaction | undefined {
        return this.transactionLoader?.getById(txId);
    }

    /**
     * Create a reversal transaction that exactly undoes a previous transfer.
     * The original transaction's `to` account sends back the same amount to the
     * `from` account. The reversal is recorded with `reversalOf` set to the
     * original transaction ID.
     *
     * Throws if the transaction is not found, has already been reversed, or if
     * either account has insufficient funds to cover the reversal.
     */
    reverseTransaction(txId: string, memo?: string): Promise<BankTransaction> {
        const original = this.getTransaction(txId);
        if (!original) throw new Error(`Transaction ${txId} not found`);

        // Guard: prevent double-reversal
        const existing = this.getTransactions().find(t => t.reversalOf === txId);
        if (existing) throw new Error(`Transaction ${txId} has already been reversed (${existing.id})`);

        const reversalMemo = memo ?? `Reversal of ${txId}`;

        const result = this._txQueue.then(() =>
            this._transferSync(
                original.toAccountId,
                original.fromAccountId,
                original.amount,
                reversalMemo,
                txId,
            )
        );
        this._txQueue = result.then(() => undefined, () => undefined);
        return result;
    }
}
