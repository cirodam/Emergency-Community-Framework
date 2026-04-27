import { randomUUID } from "crypto";

export type ClassifiedCategory = "for-sale" | "wanted" | "free" | "job" | "notice";
export type ClassifiedStatus   = "open" | "closed" | "cancelled";

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
}

export function createClassified(
    posterId: string,
    posterHandle: string,
    category: ClassifiedCategory,
    title: string,
    description: string,
    price: number,
): Classified {
    const now = new Date().toISOString();
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
        createdAt:      now,
        updatedAt:      now,
    };
}
