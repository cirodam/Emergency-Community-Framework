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
    memberCount         = 0,
): FederationApplication {
    return {
        id:                 randomUUID(),
        communityName,
        communityHandle,
        communityNodeId,
        communityPublicKey,
        status:             "submitted",
        submittedAt:        new Date().toISOString(),
        reviewedAt:         null,
        reviewNote:         null,
        memberId:           null,
        memberCount,
    };
}
