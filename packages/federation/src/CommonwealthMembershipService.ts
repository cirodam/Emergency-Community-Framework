import { NodeService, UpstreamMembershipService, type UpstreamApplicationStatus } from "@ecf/core";

export type CommonwealthApplicationStatus = UpstreamApplicationStatus;

export interface CommonwealthMembershipRecord {
    /** URL of the commonwealth node */
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

export class CommonwealthMembershipService extends UpstreamMembershipService<CommonwealthMembershipRecord> {
    private static instance: CommonwealthMembershipService;

    private _pendingName:   string = "";
    private _pendingHandle: string = "";
    private _pendingPop:    number = 0;

    private constructor(dataDir: string) {
        super(dataDir, "commonwealth_membership.json");
    }

    static getInstance(dataDir?: string): CommonwealthMembershipService {
        if (!CommonwealthMembershipService.instance) {
            if (!dataDir) throw new Error("CommonwealthMembershipService: dataDir required on first call");
            CommonwealthMembershipService.instance = new CommonwealthMembershipService(dataDir);
        }
        return CommonwealthMembershipService.instance;
    }

    // ── UpstreamMembershipService interface ──────────────────────────────────

    protected buildApplyBody(): Record<string, unknown> {
        const node = NodeService.getInstance();
        return {
            federationName:      this._pendingName,
            federationHandle:    this._pendingHandle,
            federationNodeId:    node.getIdentity().id,
            federationPublicKey: node.getSigner().publicKeyHex,
            federationUrl:       node.getIdentity().address,
            federationEntityId:  node.getIdentity().entityId,
            populationCount:     this._pendingPop,
        };
    }

    protected upstreamUrl(): string {
        return this.record!.commonwealthUrl;
    }

    protected async onApproved(base: string, memberId: string): Promise<void> {
        if (!this.record) return;

        if (!this.record.commonwealthAccountId) {
            try {
                const res = await fetch(`${base}/api/members`);
                if (res.ok) {
                    const members = await res.json() as { id: string; bankAccountId: string | null }[];
                    const member  = members.find(m => m.id === memberId);
                    if (member?.bankAccountId) this.record.commonwealthAccountId = member.bankAccountId;
                }
            } catch { /* non-fatal */ }
        }

        if (!this.record.commonwealthHandle) {
            try {
                const res = await fetch(`${base}/api/identity`);
                if (res.ok) {
                    const id = await res.json() as { handle?: string; globeHandle?: string };
                    if (id.handle)      this.record.commonwealthHandle = id.handle;
                    if (id.globeHandle) this.record.globeHandle        = id.globeHandle;
                }
            } catch { /* non-fatal */ }
        }
    }

    // ── Public API ───────────────────────────────────────────────────────────

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

        this._pendingName   = federationName;
        this._pendingHandle = federationHandle;
        this._pendingPop    = populationCount;

        const record = await this.submitApplication(
            commonwealthUrl,
            (data) => ({
                commonwealthUrl,
                applicationId:         data.id,
                memberId:              null,
                commonwealthAccountId: null,
                federationHandle,
                commonwealthHandle:    null,
                globeHandle:           null,
                status:                data.status as CommonwealthApplicationStatus,
                appliedAt:             new Date().toISOString(),
            }),
            "Commonwealth application failed",
        );

        console.log(`[CommonwealthMembership] applied to ${commonwealthUrl}: application ${record.applicationId}`);
        return record;
    }
}
