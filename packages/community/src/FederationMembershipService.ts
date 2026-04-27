import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { NodeService } from "@ecf/core";

export type FederationApplicationStatus =
    | "submitted" | "under_review" | "approved" | "rejected";

export interface FederationMembershipRecord {
    /** URL of the federation node, e.g. http://federation:3010 */
    federationUrl:       string;
    /** Application ID returned by the federation on submit */
    applicationId:       string;
    /** Set once the federation approves and creates the member record */
    memberId:            string | null;
    /** The account ID at the federation bank (set on approval) */
    federationAccountId: string | null;
    status:              FederationApplicationStatus;
    appliedAt:           string; // ISO 8601
}

/**
 * Community-level service that manages the community's relationship with
 * a federation. The community node itself (not the Currency Board) owns
 * the application process — it signs with the node key and tracks state.
 *
 * The Currency Board is responsible for kithe/kin interactions once the
 * community is an approved member and holds a federation bank account.
 */
export class FederationMembershipService {
    private static instance: FederationMembershipService;
    private readonly path: string;
    private record: FederationMembershipRecord | null = null;

    private constructor(dataDir: string) {
        mkdirSync(dataDir, { recursive: true });
        this.path = join(dataDir, "federation_membership.json");
        if (existsSync(this.path)) {
            this.record = JSON.parse(readFileSync(this.path, "utf-8")) as FederationMembershipRecord;
        }
    }

    static getInstance(dataDir?: string): FederationMembershipService {
        if (!FederationMembershipService.instance) {
            if (!dataDir) throw new Error("FederationMembershipService: dataDir required on first call");
            FederationMembershipService.instance = new FederationMembershipService(dataDir);
        }
        return FederationMembershipService.instance;
    }

    getStatus(): FederationMembershipRecord | null {
        return this.record;
    }

    private save(): void {
        writeFileSync(this.path, JSON.stringify(this.record, null, 2), "utf-8");
    }

    /**
     * Submit an application to join a federation. Signed with the community
     * node's Ed25519 key — the federation verifies it against the public key
     * provided in the body (proves key ownership before membership exists).
     */
    async apply(federationUrl: string, communityName: string): Promise<FederationMembershipRecord> {
        if (this.record && this.record.status !== "rejected") {
            throw new Error(
                `Already have a federation application in status "${this.record.status}"`,
            );
        }

        const node = NodeService.getInstance();
        const body = JSON.stringify({
            communityName,
            communityNodeId:    node.getIdentity().id,
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
            throw new Error(`Federation application failed (${res.status}): ${err.error ?? "unknown error"}`);
        }

        const data = await res.json() as { id: string; status: string };
        this.record = {
            federationUrl,
            applicationId:       data.id,
            memberId:            null,
            federationAccountId: null,
            status:              data.status as FederationApplicationStatus,
            appliedAt:           new Date().toISOString(),
        };
        this.save();
        console.log(`[FederationMembership] applied to ${federationUrl}: application ${data.id}`);
        return this.record;
    }

    /**
     * Poll the federation for the current application status and persist any
     * changes. On approval, resolves the memberId and federationAccountId so
     * the CurrencyBoard can use the account for kithe operations.
     */
    async sync(): Promise<FederationMembershipRecord | null> {
        if (!this.record) return null;
        if (this.record.status === "approved" || this.record.status === "rejected") {
            return this.record;
        }

        const base = this.record.federationUrl.replace(/\/$/, "");
        let appData: { status: string; memberId?: string | null };

        try {
            const res = await fetch(`${base}/api/applications/${this.record.applicationId}`);
            if (!res.ok) return this.record;
            appData = await res.json() as typeof appData;
        } catch {
            return this.record; // federation unreachable — return stale state
        }

        this.record.status = appData.status as FederationApplicationStatus;

        if (appData.status === "approved" && appData.memberId) {
            this.record.memberId = appData.memberId;

            if (!this.record.federationAccountId) {
                // Resolve the bank account ID from the member list
                try {
                    const res = await fetch(`${base}/api/members`);
                    if (res.ok) {
                        const members = await res.json() as { id: string; bankAccountId: string | null }[];
                        const member  = members.find(m => m.id === appData.memberId);
                        if (member?.bankAccountId) this.record.federationAccountId = member.bankAccountId;
                    }
                } catch { /* non-fatal */ }
            }
        }

        this.save();
        return this.record;
    }

    /**
     * Submit (or refresh) this community's member census to the federation.
     *
     * The census contains one nullifier per member — a pseudonymous ID derived
     * from the member's public key via HMAC. The federation stores these and
     * checks for overlap with other communities to detect double-counting.
     *
     * Returns the list of duplicate nullifiers detected by the federation, or
     * throws if the community is not an approved federation member.
     */
    async submitCensus(nullifiers: string[], memberCount: number): Promise<{ duplicates: string[] }> {
        if (!this.record || this.record.status !== "approved") {
            throw new Error("Community is not an approved federation member");
        }

        const node = NodeService.getInstance();
        const body = JSON.stringify({ memberCount, nullifiers });
        const signature = node.getSigner().signBody(body);
        const base = this.record.federationUrl.replace(/\/$/, "");

        const res = await fetch(`${base}/api/census`, {
            method: "POST",
            headers: {
                "Content-Type":     "application/json",
                "x-node-id":        node.getIdentity().id,
                "x-node-signature": signature,
            },
            body,
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({})) as { error?: string };
            throw new Error(`Census submission failed (${res.status}): ${err.error ?? "unknown error"}`);
        }

        return res.json() as Promise<{ duplicates: string[] }>;
    }
}
