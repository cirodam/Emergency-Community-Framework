import { randomUUID } from "crypto";

export type ClassifiedCategory = "for-sale" | "wanted" | "free" | "job" | "notice";
export type ClassifiedStatus   = "open" | "closed" | "cancelled" | "expired";

const DEFAULT_TTL_DAYS = 30;

export interface Classified {
    id:             string;
    posterId:       string;
    posterHandle:   string;
    category:       ClassifiedCategory;
    title:          string;
    description:    string;
    price:          number;        // kin; 0 for free/job/notice
    status:         ClassifiedStatus;
    counterpartyId: string | null; // who claimed/fulfilled it
    createdAt:      string;
    updatedAt:      string;
    expiresAt:      string;        // ISO 8601; open listings auto-expire after this
}

export function createClassified(
    posterId: string,
    posterHandle: string,
    category: ClassifiedCategory,
    title: string,
    description: string,
    price: number,
    ttlDays: number = DEFAULT_TTL_DAYS,
): Classified {
    const now     = new Date();
    const expires = new Date(now.getTime() + ttlDays * 24 * 60 * 60 * 1000);
    return {
        id: randomUUID(),
        posterId,
        posterHandle,
        category,
        title,
        description,
        price,
        status:         "open",
        counterpartyId: null,
        createdAt:      now.toISOString(),
        updatedAt:      now.toISOString(),
        expiresAt:      expires.toISOString(),
    };
}
