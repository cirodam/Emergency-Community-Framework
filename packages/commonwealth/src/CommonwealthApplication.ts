import { randomUUID } from "crypto";

export type ApplicationStatus =
    | "draft"
    | "submitted"
    | "under_review"
    | "approved"
    | "rejected";

export interface CommonwealthApplication {
    id:                   string;
    federationName:       string;
    federationHandle:     string;
    federationNodeId:     string;
    federationPublicKey:  string;
    /** Base URL of the federation node — used for directed-payment routing. */
    federationUrl:        string;
    /** Stable org UUID self-reported by the federation. */
    federationEntityId:   string;
    /** Routing priority for this node (1 = preferred). */
    federationPriority:   number;
    status:               ApplicationStatus;
    submittedAt:          string;
    reviewedAt:           string | null;
    reviewNote:           string | null;
    memberId:             string | null;
    /**
     * Total population across all member communities at application time.
     * Used to compute the initial credit line on approval.
     */
    populationCount: number;
}

export function createApplication(
    federationName:      string,
    federationHandle:    string,
    federationNodeId:    string,
    federationPublicKey: string,
    federationUrl:       string,
    federationEntityId:  string,
    populationCount      = 0,
    federationPriority   = 1,
): CommonwealthApplication {
    return {
        id:                  randomUUID(),
        federationName,
        federationHandle,
        federationNodeId,
        federationPublicKey,
        federationUrl,
        federationEntityId,
        federationPriority,
        status:              "submitted",
        submittedAt:         new Date().toISOString(),
        reviewedAt:          null,
        reviewNote:          null,
        memberId:            null,
        populationCount,
    };
}
