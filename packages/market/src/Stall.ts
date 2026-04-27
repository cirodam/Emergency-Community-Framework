import { randomUUID } from "crypto";

export type StallCategory = "produce" | "food" | "clothing" | "crafts" | "tools" | "other";
export type StallStatus   = "active" | "inactive";

export interface Stall {
    id:              string;
    marketplaceId:   string;
    marketplaceName: string;   // denormalized
    holderId:        string;
    holderHandle:    string;
    name:            string;
    description:     string;
    category:        StallCategory;
    stallNumber:     string;   // e.g. "7", "A3", "" if unassigned
    status:          StallStatus;
    createdAt:       string;
}

export function createStall(
    marketplaceId: string,
    marketplaceName: string,
    holderId: string,
    holderHandle: string,
    name: string,
    description: string,
    category: StallCategory,
    stallNumber: string,
): Stall {
    return {
        id: randomUUID(),
        marketplaceId,
        marketplaceName,
        holderId,
        holderHandle,
        name,
        description,
        category,
        stallNumber,
        status:    "active",
        createdAt: new Date().toISOString(),
    };
}

export const STALL_CATEGORIES: StallCategory[] = [
    "produce", "food", "clothing", "crafts", "tools", "other",
];
