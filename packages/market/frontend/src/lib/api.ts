import { getToken, session } from "./session.js";

async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
    const token = getToken();
    const headers = new Headers(init.headers);
    headers.set("Content-Type", "application/json");
    if (token) headers.set("Authorization", `Bearer ${token}`);
    const res = await fetch(input, { ...init, headers });
    if (res.status === 401) {
        session.logout();
    }
    return res;
}

// ── Listings ──────────────────────────────────────────────────────────────────

export type ListingType   = "item" | "service";
export type ListingSide   = "sell" | "buy";
export type ListingStatus = "open" | "sold" | "filled" | "cancelled";

export interface Listing {
    id:             string;
    side:           ListingSide;
    posterId:       string;
    posterHandle:   string;
    type:           ListingType;
    title:          string;
    description:    string;
    price:          number;
    status:         ListingStatus;
    createdAt:      string;
    updatedAt:      string;
    counterpartyId: string | null;
}

export async function getListings(side?: ListingSide, type?: ListingType): Promise<Listing[]> {
    const params = new URLSearchParams();
    if (side) params.set("side", side);
    if (type) params.set("type", type);
    const qs = params.size ? `?${params}` : "";
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
    side: ListingSide,
    type: ListingType,
    title: string,
    description: string,
    price: number,
    posterHandle: string,
): Promise<Listing> {
    const res = await apiFetch("/api/listings", {
        method: "POST",
        body:   JSON.stringify({ side, type, title, description, price, posterHandle }),
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

export async function fulfillListing(id: string): Promise<Listing> {
    const res = await apiFetch(`/api/listings/${id}/fulfill`, { method: "POST" });
    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Fulfill failed");
    }
    return res.json() as Promise<Listing>;
}
