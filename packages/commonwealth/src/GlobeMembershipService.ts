import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { NodeService } from "@ecf/core";

export type GlobeApplicationStatus =
    | "submitted" | "under_review" | "approved" | "rejected";

export interface GlobeMembershipRecord {
    /** URL of the globe node, e.g. http://globe:3030 */
    globeUrl:               string;
    /** Application ID returned by the globe on submit */
    applicationId:          string;
    /** Set once the globe approves and creates the member record */
    memberId:               string | null;
    /** The account ID at the globe bank (set on approval) */
    globeAccountId:         string | null;
    /** The handle this commonwealth chose — its segment in the routable address */
    commonwealthHandle:     string;
    /** The globe's own handle — fetched from globe identity on approval */
    globeHandle:            string | null;
    status:                 GlobeApplicationStatus;
    appliedAt:              string; // ISO 8601
}

/**
 * Commonwealth-level service that manages the commonwealth's relationship with
 * the globe. Mirrors CommonwealthMembershipService one level up.
 *
 * Once approved, the commonwealth holds a clearing account at the globe bank
 * used for inter-commonwealth kin transfers.
 */
export class GlobeMembershipService {
    private static instance: GlobeMembershipService;
    private readonly path: string;
    private record: GlobeMembershipRecord | null = null;

    private constructor(dataDir: string) {
        mkdirSync(dataDir, { recursive: true });
        this.path = join(dataDir, "globe_membership.json");
        if (existsSync(this.path)) {
            this.record = JSON.parse(readFileSync(this.path, "utf-8")) as GlobeMembershipRecord;
        }
    }

    static getInstance(dataDir?: string): GlobeMembershipService {
        if (!GlobeMembershipService.instance) {
            if (!dataDir) throw new Error("GlobeMembershipService: dataDir required on first call");
            GlobeMembershipService.instance = new GlobeMembershipService(dataDir);
        }
        return GlobeMembershipService.instance;
    }

    getStatus(): GlobeMembershipRecord | null {
        return this.record;
    }

    private save(): void {
        writeFileSync(this.path, JSON.stringify(this.record, null, 2), "utf-8");
    }

    /**
     * Submit an application to join the globe. Signed with the commonwealth
     * node's Ed25519 key — the globe verifies it against the public key
     * provided in the body.
     */
    async apply(
        globeUrl:            string,
        commonwealthName:    string,
        commonwealthHandle:  string,
        populationCount      = 0,
    ): Promise<GlobeMembershipRecord> {
        if (this.record && this.record.status !== "rejected") {
            throw new Error(
                `Already have a globe application in status "${this.record.status}"`,
            );
        }

        const node    = NodeService.getInstance();
        const selfUrl = node.getIdentity().address;
        const body    = JSON.stringify({
            commonwealthName,
            commonwealthHandle,
            commonwealthNodeId:    node.getIdentity().id,
            commonwealthPublicKey: node.getSigner().publicKeyHex,
            commonwealthUrl:       selfUrl,
            commonwealthEntityId:  node.getIdentity().entityId,
            populationCount,
        });
        const signature = node.getSigner().signBody(body);

        const res = await fetch(`${globeUrl.replace(/\/$/, "")}/api/applications`, {
            method:  "POST",
            headers: {
                "Content-Type":     "application/json",
                "x-node-signature": signature,
            },
            body,
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({})) as { error?: string };
            throw new Error(`Globe application failed (${res.status}): ${err.error ?? "unknown error"}`);
        }

        const data = await res.json() as { id: string; status: string };
        this.record = {
            globeUrl,
            applicationId:      data.id,
            memberId:           null,
            globeAccountId:     null,
            commonwealthHandle,
            globeHandle:        null,
            status:             data.status as GlobeApplicationStatus,
            appliedAt:          new Date().toISOString(),
        };
        this.save();
        console.log(`[GlobeMembership] applied to ${globeUrl}: application ${data.id}`);
        return this.record;
    }

    /**
     * Poll the globe for the current application status and persist any changes.
     * On approval, resolves the memberId, globeAccountId, and handle chain.
     */
    async sync(): Promise<GlobeMembershipRecord | null> {
        if (!this.record) return null;
        if (this.record.status === "approved" || this.record.status === "rejected") {
            return this.record;
        }

        const base = this.record.globeUrl.replace(/\/$/, "");
        let appData: { status: string; memberId?: string | null };

        try {
            const res = await fetch(`${base}/api/applications/${this.record.applicationId}`);
            if (!res.ok) return this.record;
            appData = await res.json() as typeof appData;
        } catch {
            return this.record;
        }

        this.record.status = appData.status as GlobeApplicationStatus;

        if (appData.status === "approved" && appData.memberId) {
            this.record.memberId = appData.memberId;

            if (!this.record.globeAccountId) {
                try {
                    const res = await fetch(`${base}/api/members`);
                    if (res.ok) {
                        const members = await res.json() as { id: string; bankAccountId: string | null }[];
                        const member  = members.find(m => m.id === appData.memberId);
                        if (member?.bankAccountId) this.record.globeAccountId = member.bankAccountId;
                    }
                } catch { /* non-fatal */ }
            }

            // Fetch globe's own handle from its identity endpoint
            if (!this.record.globeHandle) {
                try {
                    const res = await fetch(`${base}/api/identity`);
                    if (res.ok) {
                        const id = await res.json() as { handle?: string };
                        if (id.handle) this.record.globeHandle = id.handle;
                    }
                } catch { /* non-fatal */ }
            }
        }

        this.save();
        return this.record;
    }
}
