import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { NodeService } from "@ecf/core";

export type CommonwealthApplicationStatus =
    | "submitted" | "under_review" | "approved" | "rejected";

export interface CommonwealthMembershipRecord {
    /** URL of the commonwealth node, e.g. http://commonwealth:3020 */
    commonwealthUrl:         string;
    /** Application ID returned by the commonwealth on submit */
    applicationId:           string;
    /** Set once the commonwealth approves and creates the member record */
    memberId:                string | null;
    /** The account ID at the commonwealth bank (set on approval) */
    commonwealthAccountId:   string | null;
    /** The handle this federation chose — its segment in the routable address */
    federationHandle:        string;
    /** The commonwealth's own handle — fetched from commonwealth identity on approval */
    commonwealthHandle:      string | null;
    /** The globe the commonwealth belongs to — forwarded from commonwealth identity */
    globeHandle:             string | null;
    status:                  CommonwealthApplicationStatus;
    appliedAt:               string; // ISO 8601
}

/**
 * Federation-level service that manages the federation's relationship with
 * a commonwealth. Mirrors FederationMembershipService one level up.
 *
 * Once approved, the federation holds a clearing account at the commonwealth
 * bank used for inter-federation kin transfers.
 */
export class CommonwealthMembershipService {
    private static instance: CommonwealthMembershipService;
    private readonly path: string;
    private record: CommonwealthMembershipRecord | null = null;

    private constructor(dataDir: string) {
        mkdirSync(dataDir, { recursive: true });
        this.path = join(dataDir, "commonwealth_membership.json");
        if (existsSync(this.path)) {
            this.record = JSON.parse(readFileSync(this.path, "utf-8")) as CommonwealthMembershipRecord;
        }
    }

    static getInstance(dataDir?: string): CommonwealthMembershipService {
        if (!CommonwealthMembershipService.instance) {
            if (!dataDir) throw new Error("CommonwealthMembershipService: dataDir required on first call");
            CommonwealthMembershipService.instance = new CommonwealthMembershipService(dataDir);
        }
        return CommonwealthMembershipService.instance;
    }

    getStatus(): CommonwealthMembershipRecord | null {
        return this.record;
    }

    private save(): void {
        writeFileSync(this.path, JSON.stringify(this.record, null, 2), "utf-8");
    }

    /**
     * Submit an application to join a commonwealth. Signed with the federation
     * node's Ed25519 key — the commonwealth verifies it against the public key
     * provided in the body.
     */
    async apply(
        commonwealthUrl:  string,
        federationName:   string,
        federationHandle: string,
        populationCount   = 0,
    ): Promise<CommonwealthMembershipRecord> {
        if (this.record && this.record.status !== "rejected") {
            throw new Error(
                `Already have a commonwealth application in status "${this.record.status}"`,
            );
        }

        const node    = NodeService.getInstance();
        const selfUrl = node.getIdentity().address;
        const body    = JSON.stringify({
            federationName,
            federationHandle,
            federationNodeId:    node.getIdentity().id,
            federationPublicKey: node.getSigner().publicKeyHex,
            federationUrl:       selfUrl,
            federationEntityId:  node.getIdentity().entityId,
            populationCount,
        });
        const signature = node.getSigner().signBody(body);

        const res = await fetch(`${commonwealthUrl.replace(/\/$/, "")}/api/applications`, {
            method:  "POST",
            headers: {
                "Content-Type":     "application/json",
                "x-node-signature": signature,
            },
            body,
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({})) as { error?: string };
            throw new Error(`Commonwealth application failed (${res.status}): ${err.error ?? "unknown error"}`);
        }

        const data = await res.json() as { id: string; status: string };
        this.record = {
            commonwealthUrl,
            applicationId:        data.id,
            memberId:             null,
            commonwealthAccountId: null,
            federationHandle,
            commonwealthHandle:   null,
            globeHandle:          null,
            status:               data.status as CommonwealthApplicationStatus,
            appliedAt:            new Date().toISOString(),
        };
        this.save();
        console.log(`[CommonwealthMembership] applied to ${commonwealthUrl}: application ${data.id}`);
        return this.record;
    }

    /**
     * Poll the commonwealth for the current application status and persist any
     * changes. On approval, resolves the memberId, commonwealthAccountId, and
     * handle chain so the federation can route payments upward.
     */
    async sync(): Promise<CommonwealthMembershipRecord | null> {
        if (!this.record) return null;
        if (this.record.status === "approved" || this.record.status === "rejected") {
            return this.record;
        }

        const base = this.record.commonwealthUrl.replace(/\/$/, "");
        let appData: { status: string; memberId?: string | null };

        try {
            const res = await fetch(`${base}/api/applications/${this.record.applicationId}`);
            if (!res.ok) return this.record;
            appData = await res.json() as typeof appData;
        } catch {
            return this.record;
        }

        this.record.status = appData.status as CommonwealthApplicationStatus;

        if (appData.status === "approved" && appData.memberId) {
            this.record.memberId = appData.memberId;

            if (!this.record.commonwealthAccountId) {
                try {
                    const res = await fetch(`${base}/api/members`);
                    if (res.ok) {
                        const members = await res.json() as { id: string; bankAccountId: string | null }[];
                        const member  = members.find(m => m.id === appData.memberId);
                        if (member?.bankAccountId) this.record.commonwealthAccountId = member.bankAccountId;
                    }
                } catch { /* non-fatal */ }
            }

            // Fetch commonwealth's handle chain from its identity endpoint
            if (!this.record.commonwealthHandle) {
                try {
                    const res = await fetch(`${base}/api/identity`);
                    if (res.ok) {
                        const id = await res.json() as {
                            handle?: string;
                            globeHandle?: string;
                        };
                        if (id.handle)      this.record.commonwealthHandle = id.handle;
                        if (id.globeHandle) this.record.globeHandle        = id.globeHandle;
                    }
                } catch { /* non-fatal */ }
            }
        }

        this.save();
        return this.record;
    }
}
