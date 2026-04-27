import { randomUUID } from "crypto";

export type ListingType   = "item" | "service";
export type ListingSide   = "sell" | "buy";
export type ListingStatus = "open" | "sold" | "filled" | "cancelled";

export interface Listing {
    id:           string;
    side:         ListingSide;   // "sell" = offering, "buy" = wanted
    posterId:     string;        // person ID of the poster (seller OR buyer)
    posterHandle: string;
    type:         ListingType;
    title:        string;
    description:  string;
    price:        number;        // kin; 0 = free / gift / negotiable
    status:       ListingStatus;
    createdAt:    string;        // ISO 8601
    updatedAt:    string;        // ISO 8601
    counterpartyId: string | null; // set on completion: who bought (sell) or who fulfilled (buy)
}

export function createListing(
    side: ListingSide,
    posterId: string,
    posterHandle: string,
    type: ListingType,
    title: string,
    description: string,
    price: number,
): Listing {
    const now = new Date().toISOString();
    return {
        id: randomUUID(),
        side,
        posterId,
        posterHandle,
        type,
        title,
        description,
        price,
        status:        "open",
        createdAt:     now,
        updatedAt:     now,
        counterpartyId: null,
    };
}
