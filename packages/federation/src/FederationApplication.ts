import { randomUUID } from "crypto";

export type ApplicationStatus =
    | "draft"
    | "submitted"
    | "under_review"
    | "approved"
    | "rejected";

export interface FederationApplication {
    id:                 string;
    communityName:      string;
    communityHandle:    string;   // URL-safe, unique within this federation
    communityNodeId:    string;
    communityPublicKey: string;
    /** Base URL of the community node, e.g. http://maplewood:3002 — used for payment routing. */
    communityUrl:       string;
    /** Stable org UUID self-reported by the community. */
    communityEntityId:  string;
    /** Routing priority for this node (1 = preferred). */
    communityPriority:  number;
    status:             ApplicationStatus;
    submittedAt:        string;       // ISO 8601
    reviewedAt:         string | null;
    reviewNote:         string | null;
    /** Set when status transitions to "approved". */
    memberId:           string | null;
    /**
     * Number of residents the community reported at application time.
     * Used to compute the initial credit line on approval.
     */
    memberCount:        number;
}

export function createApplication(
    communityName:      string,
    communityHandle:    string,
    communityNodeId:    string,
    communityPublicKey: string,
    communityUrl:       string,
    communityEntityId:  string,
    memberCount         = 0,
    communityPriority   = 1,
): FederationApplication {
    return {
        id:                 randomUUID(),
        communityName,
        communityHandle,
        communityNodeId,
        communityPublicKey,
        communityUrl,
        communityEntityId,
        communityPriority,
        status:             "submitted",
        submittedAt:        new Date().toISOString(),
        reviewedAt:         null,
        reviewNote:         null,
        memberId:           null,
        memberCount,
    };
}
