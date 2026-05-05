import { randomUUID } from "crypto";

export type ClassRequestStatus = "open" | "claimed" | "fulfilled";

export interface ClassRequest {
    id:             string;
    requesterId:    string;
    requesterHandle: string;
    title:          string;
    description:    string;
    upvoteIds:      string[]; // member IDs who upvoted
    status:         ClassRequestStatus;
    claimedBy:      string | null; // instructor handle
    sessionId:      string | null; // the session created from this request
    createdAt:      string;
}

export function createClassRequest(
    requesterId: string,
    requesterHandle: string,
    title: string,
    description: string,
): ClassRequest {
    return {
        id: randomUUID(),
        requesterId,
        requesterHandle,
        title,
        description,
        upvoteIds: [],
        status:    "open",
        claimedBy: null,
        sessionId: null,
        createdAt: new Date().toISOString(),
    };
}
