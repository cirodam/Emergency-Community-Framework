import { BankClient } from "../../BankClient.js";
import { CurrencyBoardLoader, type FederationMembership } from "./CurrencyBoardLoader.js";
import { FunctionalDomain } from "../../common/domain/FunctionalDomain.js";
import { NodeService } from "@ecf/core";

export const CURRENCY_BOARD_DOMAIN_ID = "ecf-domain-currency-board-000000002";

/**
 * The Currency Board is the sole issuer of kithe.
 *
 * As a FunctionalDomain it participates fully in community governance.
 * Kithe is a stable, reserve-backed currency. The currency board issues kithe
 * only against deposited reserves (e.g. kin, goods, labour pledges) and
 * retires kithe when reserves are withdrawn.
 *
 * Like the central bank for kin, the currency board holds one issuance account
 * with overdraftLimit = -Infinity. Negative balance = kithe in circulation.
 *
 * Lifecycle: identical to CentralBank — first boot registers the institution
 * with the bank and opens the issuance account; subsequent boots load from disk.
 */
export class CurrencyBoard extends FunctionalDomain {
    private static instance: CurrencyBoard;

    private _ownerId!: string;
    private _issuanceAccountId!: string;
    private _bank!: BankClient;
    private _loader!: CurrencyBoardLoader;
    private _record!: ReturnType<CurrencyBoardLoader["load"]>;
    private _ready = false;

    private constructor() {
        super("Currency Board", "Sole issuer of kithe, the community's stable reserve-backed currency.", CURRENCY_BOARD_DOMAIN_ID);
    }

    static getInstance(): CurrencyBoard {
        if (!CurrencyBoard.instance) CurrencyBoard.instance = new CurrencyBoard();
        return CurrencyBoard.instance;
    }

    isReady(): boolean              { return this._ready; }
    get ownerId(): string           { if (!this._ready) throw new Error("CurrencyBoard not ready"); return this._ownerId; }
    get issuanceAccountId(): string { if (!this._ready) throw new Error("CurrencyBoard not ready"); return this._issuanceAccountId; }

    async init(bank: BankClient, loader: CurrencyBoardLoader): Promise<void> {
        this._bank   = bank;
        this._loader = loader;

        if (loader.exists()) {
            const record = loader.load();
            this._ownerId           = record.ownerId;
            this._issuanceAccountId = record.issuanceAccountId;
            this._record            = record;
            this._ready = true;
            return;
        }

        // First boot — register with the bank
        const owner = await bank.createOwner("institution", "Currency Board");
        this._ownerId = owner.ownerId;

        const account = await bank.openAccount(
            this._ownerId,
            "Currency Board",
            "kithe",
            null, // null → overdraftLimit -Infinity on the bank side
        );
        this._issuanceAccountId = account.accountId;

        this._record = {
            ownerId:           this._ownerId,
            issuanceAccountId: this._issuanceAccountId,
            registeredAt:      new Date().toISOString(),
            federation:        null,
        };
        loader.save(this._record);
        this._ready = true;
    }

    get federation(): FederationMembership | null {
        return this._record?.federation ?? null;
    }

    // ── Money operations ────────────────────────────────────────────────────

    /**
     * Issue kithe into circulation against deposited reserves.
     * The issuance account may go arbitrarily negative — each unit below zero
     * represents one kithe unit in circulation.
     */
    async issue(amount: number, recipientAccountId: string, memo = "kithe issuance"): Promise<void> {
        await this._bank.transfer(this._issuanceAccountId, recipientAccountId, amount, memo);
    }

    /**
     * Retire kithe from circulation when reserves are withdrawn.
     */
    async retire(amount: number, sourceAccountId: string, memo = "kithe retirement"): Promise<void> {
        await this._bank.transfer(sourceAccountId, this._issuanceAccountId, amount, memo);
    }

    /**
     * Apply demurrage to all kithe accounts. Collected fees flow into the
     * issuance account, reducing the outstanding supply.
     *
     * @param rate  Fraction of balance to collect, e.g. 0.02 = 2%
     * @param memo  Recorded on each generated transaction
     */
    async applyDemurrage(
        rate: number,
        memo = "kithe demurrage",
        excludeAccountIds: string[] = [],
        floor = 0,
    ): Promise<{ count: number }> {
        return this._bank.applyDemurrage("kithe", rate, this._issuanceAccountId, memo, floor, excludeAccountIds);
    }

    // ── Federation membership ───────────────────────────────────────────────

    /**
     * Submit an application to join a federation. The request is signed with
     * this node's key — the federation verifies it using the public key in the
     * body, proving key ownership without prior registration.
     *
     * Stores the returned application ID and status persistently.
     */
    async applyToFederation(federationUrl: string, communityName: string): Promise<FederationMembership> {
        if (this._record.federation && this._record.federation.status !== "rejected") {
            throw new Error(
                `Already have a federation application in status "${this._record.federation.status}"`,
            );
        }

        const node = NodeService.getInstance();
        const body = JSON.stringify({
            communityName,
            communityNodeId:    node.nodeId,
            communityPublicKey: node.getSigner().publicKeyHex,
        });
        const signature = node.getSigner().signBody(body);

        const res = await fetch(`${federationUrl.replace(/\/$/, "")}/api/applications`, {
            method:  "POST",
            headers: {
                "Content-Type":     "application/json",
                "x-node-signature": signature,
            },
            body,
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({})) as { error?: string };
            throw new Error(`Federation application failed: ${err.error ?? res.status}`);
        }

        const data = await res.json() as { id: string; status: string };
        const membership: FederationMembership = {
            federationUrl,
            applicationId:       data.id,
            memberId:            null,
            federationAccountId: null,
            status:              data.status as FederationMembership["status"],
            appliedAt:           new Date().toISOString(),
        };

        this._record.federation = membership;
        this._loader.save(this._record);
        console.log(`[CurrencyBoard] applied to federation at ${federationUrl}: application ${data.id}`);
        return membership;
    }

    /**
     * Poll the federation for the current application status and update local state.
     * Call this periodically or on demand from the community frontend.
     */
    async syncFederationStatus(): Promise<FederationMembership | null> {
        const f = this._record.federation;
        if (!f) return null;
        if (f.status === "approved" || f.status === "rejected") return f;

        const url = `${f.federationUrl.replace(/\/$/, "")}/api/applications/${f.applicationId}`;
        let data: {
            status:          string;
            memberId?:       string | null;
        };

        try {
            const res = await fetch(url);
            if (!res.ok) return f;
            data = await res.json() as typeof data;
        } catch {
            return f; // federation unreachable — return stale state
        }

        f.status = data.status as FederationMembership["status"];

        if (data.status === "approved" && data.memberId) {
            f.memberId = data.memberId;

            // Fetch the bank account ID from the member record
            const memberRes = await fetch(
                `${f.federationUrl.replace(/\/$/, "")}/api/members`,
            ).catch(() => null);

            if (memberRes?.ok) {
                const members = await memberRes.json() as { id: string; bankAccountId: string | null }[];
                const member  = members.find(m => m.id === data.memberId);
                if (member?.bankAccountId) f.federationAccountId = member.bankAccountId;
            }
        }

        this._loader.save(this._record);
        return f;
    }

    /**
     * Return the kithe balance held at the federation bank.
     * Only available once the application is approved and a bank account is open.
     */
    async federationBalance(): Promise<number | null> {
        const f = this._record.federation;
        if (!f?.federationAccountId) return null;

        try {
            const res = await fetch(
                `${f.federationUrl.replace(/\/$/, "")}/api/economics`,
            );
            if (!res.ok) return null;
            // The economics endpoint returns per-member balances by name
            // but we have a direct account ID — use the federation bank directly
            // via a federation-proxied endpoint (future). For now return null.
            return null;
        } catch {
            return null;
        }
    }
}
