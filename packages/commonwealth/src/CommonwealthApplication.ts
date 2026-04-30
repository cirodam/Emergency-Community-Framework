import { randomUUID } from "crypto";
import { type BaseApplication, type ApplicationStatus } from "@ecf/core";

export type { ApplicationStatus };

export interface CommonwealthApplication extends BaseApplication {
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
