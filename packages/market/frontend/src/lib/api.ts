import { getToken } from "./session.js";

function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
    const token = getToken();
    const headers = new Headers(init.headers);
    headers.set("Content-Type", "application/json");
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return fetch(input, { ...init, headers });
}

// ── Listings ──────────────────────────────────────────────────────────────────

export type ListingType   = "item" | "service";
export type ListingStatus = "open" | "sold" | "cancelled";

export interface Listing {
    id:           string;
    sellerId:     string;
    sellerHandle: string;
    type:         ListingType;
    title:        string;
    description:  string;
    price:        number;
    status:       ListingStatus;
    createdAt:    string;
    updatedAt:    string;
    buyerId:      string | null;
}

export async function getListings(type?: ListingType): Promise<Listing[]> {
    const qs = type ? `?type=${type}` : "";
    const res = await fetch(`/api/listings${qs}`);
    if (!res.ok) throw new Error("Failed to load listings");
    return res.json() as Promise<Listing[]>;
}

export async function getListing(id: string): Promise<Listing> {
    const res = await fetch(`/api/listings/${id}`);
    if (!res.ok) throw new Error("Listing not found");
    return res.json() as Promise<Listing>;
}

export async function createListing(
    type: ListingType,
    title: string,
    description: string,
    price: number,
    sellerHandle: string,
): Promise<Listing> {
    const res = await apiFetch("/api/listings", {
        method: "POST",
        body:   JSON.stringify({ type, title, description, price, sellerHandle }),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Failed to create listing");
    }
    return res.json() as Promise<Listing>;
}

export async function cancelListing(id: string): Promise<Listing> {
    const res = await apiFetch(`/api/listings/${id}`, { method: "DELETE" });
    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Failed to cancel listing");
    }
    return res.json() as Promise<Listing>;
}

export async function purchaseListing(id: string): Promise<Listing> {
    const res = await apiFetch(`/api/listings/${id}/purchase`, { method: "POST" });
    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Purchase failed");
    }
    return res.json() as Promise<Listing>;
}
