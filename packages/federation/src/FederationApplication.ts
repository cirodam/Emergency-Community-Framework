import { randomUUID } from "crypto";
import { type BaseApplication, type ApplicationStatus } from "@ecf/core";

export type { ApplicationStatus };

export interface FederationApplication extends BaseApplication {
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
