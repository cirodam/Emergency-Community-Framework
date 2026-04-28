import { randomUUID } from "crypto";

export type ApplicationStatus =
    | "draft"
    | "submitted"
    | "under_review"
    | "approved"
    | "rejected";

export interface GlobeApplication {
    id:                      string;
    commonwealthName:        string;
    commonwealthHandle:      string;
    commonwealthNodeId:      string;
    commonwealthPublicKey:   string;
    /** Base URL of the commonwealth node — used for directed-payment routing. */
    commonwealthUrl:         string;
    /** Stable org UUID self-reported by the commonwealth. */
    commonwealthEntityId:    string;
    /** Routing priority for this node (1 = preferred). */
    commonwealthPriority:    number;
    status:                  ApplicationStatus;
    submittedAt:             string;
    reviewedAt:              string | null;
    reviewNote:              string | null;
    memberId:                string | null;
    /**
     * Total population across all member communities (through federation and
     * commonwealth layers) at application time.
     */
    populationCount: number;
}

export function createGlobeApplication(
    commonwealthName:      string,
    commonwealthHandle:    string,
    commonwealthNodeId:    string,
    commonwealthPublicKey: string,
    commonwealthUrl:       string,
    commonwealthEntityId:  string,
    populationCount        = 0,
    commonwealthPriority   = 1,
): GlobeApplication {
    return {
        id:                    randomUUID(),
        commonwealthName,
        commonwealthHandle,
        commonwealthNodeId,
        commonwealthPublicKey,
        commonwealthUrl,
        commonwealthEntityId,
        commonwealthPriority,
        status:                "submitted",
        submittedAt:           new Date().toISOString(),
        reviewedAt:            null,
        reviewNote:            null,
        memberId:              null,
        populationCount,
    };
}
