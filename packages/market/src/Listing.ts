import { randomUUID } from "crypto";

export type ListingType   = "item" | "service";
export type ListingStatus = "open" | "sold" | "cancelled";

export interface Listing {
    id:           string;
    sellerId:     string;       // person ID of the seller
    sellerHandle: string;
    type:         ListingType;
    title:        string;
    description:  string;
    price:        number;       // kin; 0 = free / gift
    status:       ListingStatus;
    createdAt:    string;       // ISO 8601
    updatedAt:    string;       // ISO 8601
    buyerId:      string | null; // set when status = "sold"
}

export function createListing(
    sellerId: string,
    sellerHandle: string,
    type: ListingType,
    title: string,
    description: string,
    price: number,
): Listing {
    const now = new Date().toISOString();
    return {
        id: randomUUID(),
        sellerId,
        sellerHandle,
        type,
        title,
        description,
        price,
        status:    "open",
        createdAt: now,
        updatedAt: now,
        buyerId:   null,
    };
}
