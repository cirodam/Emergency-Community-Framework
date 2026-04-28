import { NodeService, UpstreamMembershipService, type UpstreamApplicationStatus } from "@ecf/core";

export type GlobeApplicationStatus = UpstreamApplicationStatus;

export interface GlobeMembershipRecord {
    /** URL of the globe node */
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

export class GlobeMembershipService extends UpstreamMembershipService<GlobeMembershipRecord> {
    private static instance: GlobeMembershipService;

    private _pendingName:   string = "";
    private _pendingHandle: string = "";
    private _pendingPop:    number = 0;

    private constructor(dataDir: string) {
        super(dataDir, "globe_membership.json");
    }

    static getInstance(dataDir?: string): GlobeMembershipService {
        if (!GlobeMembershipService.instance) {
            if (!dataDir) throw new Error("GlobeMembershipService: dataDir required on first call");
            GlobeMembershipService.instance = new GlobeMembershipService(dataDir);
        }
        return GlobeMembershipService.instance;
    }

    // ── UpstreamMembershipService interface ──────────────────────────────────

    protected buildApplyBody(): Record<string, unknown> {
        const node = NodeService.getInstance();
        return {
            commonwealthName:      this._pendingName,
            commonwealthHandle:    this._pendingHandle,
            commonwealthNodeId:    node.getIdentity().id,
            commonwealthPublicKey: node.getSigner().publicKeyHex,
            commonwealthUrl:       node.getIdentity().address,
            commonwealthEntityId:  node.getIdentity().entityId,
            populationCount:       this._pendingPop,
        };
    }

    protected upstreamUrl(): string {
        return this.record!.globeUrl;
    }

    protected async onApproved(base: string, memberId: string): Promise<void> {
        if (!this.record) return;

        if (!this.record.globeAccountId) {
            try {
                const res = await fetch(`${base}/api/members`);
                if (res.ok) {
                    const members = await res.json() as { id: string; bankAccountId: string | null }[];
                    const member  = members.find(m => m.id === memberId);
                    if (member?.bankAccountId) this.record.globeAccountId = member.bankAccountId;
                }
            } catch { /* non-fatal */ }
        }

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

    // ── Public API ───────────────────────────────────────────────────────────

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

        this._pendingName   = commonwealthName;
        this._pendingHandle = commonwealthHandle;
        this._pendingPop    = populationCount;

        const record = await this.submitApplication(
            globeUrl,
            (data) => ({
                globeUrl,
                applicationId:  data.id,
                memberId:       null,
                globeAccountId: null,
                commonwealthHandle,
                globeHandle:    null,
                status:         data.status as GlobeApplicationStatus,
                appliedAt:      new Date().toISOString(),
            }),
            "Globe application failed",
        );

        console.log(`[GlobeMembership] applied to ${globeUrl}: application ${record.applicationId}`);
        return record;
    }
}
