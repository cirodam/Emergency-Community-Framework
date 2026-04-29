import { BankClient, FileStore } from "@ecf/core";
import { FederationFunctionalDomain } from "../../common/FederationFunctionalDomain.js";
import { FederationConstitution } from "../../governance/FederationConstitution.js";
import { FederationMemberService } from "../../FederationMemberService.js";
import { HealthInsuranceClaim } from "./HealthInsuranceClaim.js";
import type { HealthInsuranceClaimLoader } from "./HealthInsuranceClaimLoader.js";

export const FEDERATION_HEALTH_INSURANCE_DOMAIN_ID = "ecf-federation-domain-health-insurance-000001";
export const FEDERATION_HEALTH_INSURANCE_OWNER_ID  = "ecf-fed-health-insurance-pool";

interface PoolRecord { ownerId: string; accountId: string; registeredAt: string; }

/**
 * Federation Health Insurance Domain
 *
 * Provides cross-community health insurance pooling:
 *   - Member communities submit claims on behalf of their residents
 *   - Claims ≤ constitution.maxAutoApprovedClaim are approved automatically
 *     and the kin transferred immediately to the community's clearing account
 *   - Larger claims are flagged for council/assembly review
 */
export class HealthInsuranceDomain extends FederationFunctionalDomain {
    private static _instance: HealthInsuranceDomain;

    private bank!: BankClient;
    private claimLoader!: HealthInsuranceClaimLoader;
    private claims = new Map<string, HealthInsuranceClaim>();
    private _poolAccountId: string | null = null;
    private _poolOwnerId:   string | null = null;
    private _ready = false;

    private constructor() {
        super(
            "Health Insurance",
            "Cross-community health insurance pool. Handles claims from member communities for major illness, surgery, and catastrophic care that exceeds local capacity.",
            FEDERATION_HEALTH_INSURANCE_DOMAIN_ID,
        );
    }

    static getInstance(): HealthInsuranceDomain {
        if (!HealthInsuranceDomain._instance) {
            HealthInsuranceDomain._instance = new HealthInsuranceDomain();
        }
        return HealthInsuranceDomain._instance;
    }

    isReady(): boolean                     { return this._ready; }
    get poolAccountId(): string | null     { return this._poolAccountId; }

    async init(bank: BankClient, loader: HealthInsuranceClaimLoader, dataDir?: string): Promise<void> {
        this.bank        = bank;
        this.claimLoader = loader;

        // Load persisted claims
        for (const c of loader.loadAll()) {
            this.claims.set(c.id, c);
        }

        // Use a simple FileStore to persist the pool account IDs across restarts
        // (same pattern as FederationTreasury)
        const poolStore = dataDir ? new FileStore(dataDir) : null;
        const existingRecord = poolStore?.readAll<PoolRecord>()[0] ?? null;

        if (existingRecord) {
            this._poolOwnerId   = existingRecord.ownerId;
            this._poolAccountId = existingRecord.accountId;
        } else {
            const owner = await bank.createOwner("institution", "Federation Health Insurance Pool", {
                ownerId: FEDERATION_HEALTH_INSURANCE_OWNER_ID,
            });
            this._poolOwnerId = owner.ownerId as string;

            const account = await bank.openAccount(
                this._poolOwnerId,
                "Health Insurance Pool",
                "kithe",
            );
            this._poolAccountId = account.accountId as string;

            poolStore?.write("pool", {
                ownerId:      this._poolOwnerId,
                accountId:    this._poolAccountId,
                registeredAt: new Date().toISOString(),
            });
        }

        this._ready = true;
        console.log(`[HealthInsuranceDomain] ready; pool account: ${this._poolAccountId}; claims loaded: ${this.claims.size}`);
    }

    // ── Queries ───────────────────────────────────────────────────────────────

    getAll(): HealthInsuranceClaim[] {
        return Array.from(this.claims.values())
            .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
    }

    getById(id: string): HealthInsuranceClaim | undefined { return this.claims.get(id); }

    getByCommunity(communityMemberId: string): HealthInsuranceClaim[] {
        return this.getAll().filter(c => c.communityMemberId === communityMemberId);
    }

    async poolBalance(): Promise<number> {
        if (!this._poolAccountId) return 0;
        try {
            const account = await this.bank.getAccountById(this._poolAccountId) as { amount?: number } | null;
            return account?.amount ?? 0;
        } catch {
            return 0;
        }
    }

    // ── Submit a claim ────────────────────────────────────────────────────────

    async submitClaim(opts: {
        communityMemberId: string;
        communityHandle:   string;
        patientName:       string;
        reason:            string;
        requestedKin:      number;
    }): Promise<HealthInsuranceClaim> {
        if (!this._ready) throw new Error("Health Insurance Domain not initialised");
        if (opts.requestedKin <= 0) throw new Error("requestedKin must be positive");

        // Verify community is a member
        const member = FederationMemberService.getInstance().getById(opts.communityMemberId);
        if (!member) throw new Error("Community is not a federation member");

        const constitution     = FederationConstitution.getInstance();
        const autoApproveLimit = constitution.maxAutoApprovedClaim;

        const claim = new HealthInsuranceClaim(opts);

        if (claim.requestedKin <= autoApproveLimit) {
            await this.disburse(claim, claim.requestedKin, "auto-approved");
        } else {
            claim.status = "needs-review";
        }

        this.claims.set(claim.id, claim);
        this.claimLoader.save(claim);
        return claim;
    }

    // ── Review a claim (council/assembly) ─────────────────────────────────────

    async reviewClaim(opts: {
        claimId:     string;
        status:      "approved" | "rejected";
        approvedKin?: number;
        reviewNote?:  string;
    }): Promise<HealthInsuranceClaim> {
        if (!this._ready) throw new Error("Health Insurance Domain not initialised");
        const claim = this.claims.get(opts.claimId);
        if (!claim)                                                                throw new Error("Claim not found");
        if (claim.status !== "needs-review" && claim.status !== "pending") {
            throw new Error(`Claim is already in status "${claim.status}"`);
        }

        claim.reviewedAt = new Date().toISOString();
        claim.reviewNote = opts.reviewNote ?? "";

        if (opts.status === "rejected") {
            claim.status = "rejected";
            this.claimLoader.save(claim);
            return claim;
        }

        const kin = opts.approvedKin ?? claim.requestedKin;
        await this.disburse(claim, kin, "approved");
        this.claimLoader.save(claim);
        return claim;
    }

    // ── Internal ──────────────────────────────────────────────────────────────

    private async disburse(
        claim:     HealthInsuranceClaim,
        kin:       number,
        newStatus: "auto-approved" | "approved",
    ): Promise<void> {
        const member = FederationMemberService.getInstance().getById(claim.communityMemberId);
        if (!member?.bankAccountId) {
            throw new Error("Community does not have a federation bank account to receive funds");
        }

        const tx = await this.bank.transfer(
            this._poolAccountId!,
            member.bankAccountId,
            kin,
            `Health insurance claim ${claim.id}: ${claim.patientName} — ${claim.reason}`,
        ) as unknown as { transactionId?: string } | undefined;

        claim.approvedKin = kin;
        claim.status      = newStatus;
        claim.transferId  = tx?.transactionId ?? null;
        claim.reviewedAt  = new Date().toISOString();

        console.log(`[HealthInsuranceDomain] disbursed ${kin} kin to ${claim.communityHandle} (claim ${claim.id})`);
    }
}
