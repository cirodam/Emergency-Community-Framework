import { BankClient } from "../../BankClient.js";
import { Person } from "../../person/Person.js";
import { SocialInsuranceMember } from "./SocialInsuranceMember.js";
import { SocialInsuranceMemberLoader } from "./SocialInsuranceMemberLoader.js";
import { SocialInsuranceBankLoader } from "./SocialInsuranceBankLoader.js";

/**
 * The Social Insurance Bank maintains the community retirement pool.
 *
 * Every member contributes to the pool on joining (join endowment) and on each
 * birthday (one person-year of kin). On retirement, members receive equal monthly
 * payments drawn from the pool. On departure, the member's unspent entitlement
 * (contributed − received) is burned, shrinking the supply to match the living
 * population.
 *
 * The pool account is excluded from demurrage — it holds deferred liabilities,
 * not circulating kin. Pass `socialInsuranceBank.poolAccountId` in the
 * `excludeAccountIds` array when calling `CentralBank.applyDemurrage()`.
 *
 * All monetary operations (deposits to / withdrawals from the pool) are
 * performed by the caller (CentralBank) using `BankClient.transfer()`. This
 * class is responsible only for pool accounting and payout mechanics.
 */
export class SocialInsuranceBank {
    private static instance: SocialInsuranceBank;

    private _ownerId!: string;
    private _poolAccountId!: string;
    private _bank!: BankClient;
    private _ready = false;

    private records: Map<string, SocialInsuranceMember> = new Map();
    private memberLoader!: SocialInsuranceMemberLoader;

    private constructor() {}

    static getInstance(): SocialInsuranceBank {
        if (!SocialInsuranceBank.instance) {
            SocialInsuranceBank.instance = new SocialInsuranceBank();
        }
        return SocialInsuranceBank.instance;
    }

    isReady(): boolean          { return this._ready; }
    get ownerId(): string       { if (!this._ready) throw new Error("SocialInsuranceBank not ready"); return this._ownerId; }
    get poolAccountId(): string { if (!this._ready) throw new Error("SocialInsuranceBank not ready"); return this._poolAccountId; }

    async init(
        bank: BankClient,
        loader: SocialInsuranceBankLoader,
        memberLoader: SocialInsuranceMemberLoader,
    ): Promise<void> {
        this._bank        = bank;
        this.memberLoader = memberLoader;

        for (const r of memberLoader.loadAll()) {
            this.records.set(r.memberId, r);
        }

        if (loader.exists()) {
            const record      = loader.load();
            this._ownerId     = record.ownerId;
            this._poolAccountId = record.poolAccountId;
            this._ready = true;
            return;
        }

        // First boot — register with the bank
        const owner = await bank.createOwner("institution", "Social Insurance Bank");
        this._ownerId = owner.ownerId;

        // Pool account: no overdraft (cannot go negative — it only holds deposits)
        const account = await bank.openAccount(
            this._ownerId,
            "Social Insurance Bank",
            "kin",
            0,
        );
        this._poolAccountId = account.accountId;

        loader.save({
            ownerId:      this._ownerId,
            poolAccountId: this._poolAccountId,
            registeredAt:  new Date().toISOString(),
        });
        this._ready = true;
    }

    // ── Pool accounting ───────────────────────────────────────────────────────

    /** Sum of all poolContributed across every member record. */
    getTotalPoolContributed(): number {
        let total = 0;
        for (const r of this.records.values()) total += r.poolContributed;
        return total;
    }

    /** Sum of all poolReceived across every member record. */
    getTotalPaidOut(): number {
        let total = 0;
        for (const r of this.records.values()) total += r.poolReceived;
        return total;
    }

    /** Number of members who have a pool record. */
    getMemberCount(): number {
        return this.records.size;
    }

    /**
     * Record that `amount` kin has been minted into the pool on behalf of a
     * member. Called by CentralBank after each deposit to the pool account.
     * Creates the member record if it does not yet exist.
     */
    recordContribution(memberId: string, amount: number): void {
        let r = this.records.get(memberId);
        if (!r) {
            r = new SocialInsuranceMember(memberId);
            this.records.set(memberId, r);
        }
        r.poolContributed += amount;
        this.memberLoader.save(r);
    }

    /**
     * Returns `max(0, contributed − received)` for a member.
     * Called by CentralBank to determine how much to burn on member departure.
     */
    getUnspentEntitlement(memberId: string): number {
        const r = this.records.get(memberId);
        if (!r) return 0;
        return Math.max(0, r.poolContributed - r.poolReceived);
    }

    /**
     * Remove a member's pool record after CentralBank has burned their
     * entitlement as part of the discharge flow.
     */
    clearMemberRecord(memberId: string): void {
        this.records.delete(memberId);
        this.memberLoader.delete(memberId);
    }

    // ── Payouts ───────────────────────────────────────────────────────────────

    /**
     * Distribute monthly retirement payments to all retired persons.
     *
     * Total payout = poolBalance × payoutRate, split equally among retirees.
     * Each payment transfers from the pool account to the retiree's primary
     * bank account.
     *
     * The caller is responsible for filtering `retiredPersons` (e.g. by age
     * against `Constitution.getInstance().retirementAge`).
     *
     * @param retiredPersons  Pre-filtered list of persons eligible for payment
     * @param payoutRate      Fraction of pool to distribute this month
     */
    async issueMonthlyPayments(retiredPersons: Person[], payoutRate: number): Promise<void> {
        if (retiredPersons.length === 0) return;

        // Fetch pool balance
        const poolAccountInfo = await this._bank.getAccountById(this._poolAccountId);
        if (!poolAccountInfo) return;
        const poolBalance = poolAccountInfo.amount;

        const totalPayout = Math.floor(poolBalance * payoutRate);
        if (totalPayout <= 0) return;

        const perPerson = Math.floor(totalPayout / retiredPersons.length);
        if (perPerson <= 0) return;

        for (const person of retiredPersons) {
            const memberAccount = await this._bank.getPrimaryAccountAsync(person.id);
            if (!memberAccount) continue;

            await this._bank.transfer(
                this._poolAccountId,
                memberAccount.accountId,
                perPerson,
                "retirement income",
            );

            let r = this.records.get(person.id);
            if (!r) {
                r = new SocialInsuranceMember(person.id);
                this.records.set(r.memberId, r);
            }
            r.poolReceived += perPerson;
            this.memberLoader.save(r);
        }
    }
}
