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

// ── Classifieds ───────────────────────────────────────────────────────────────

export type ClassifiedCategory = "for-sale" | "wanted" | "free" | "job" | "notice";
export type ClassifiedStatus   = "open" | "closed" | "cancelled";

export interface Classified {
    id:             string;
    posterId:       string;
    posterHandle:   string;
    category:       ClassifiedCategory;
    title:          string;
    description:    string;
    price:          number;
    status:         ClassifiedStatus;
    counterpartyId: string | null;
    createdAt:      string;
    updatedAt:      string;
}

export async function listClassifieds(category?: ClassifiedCategory): Promise<Classified[]> {
    const qs = category ? `?category=${encodeURIComponent(category)}` : "";
    const res = await fetch(`/api/classifieds${qs}`);
    if (!res.ok) throw new Error("Failed to load classifieds");
    return res.json() as Promise<Classified[]>;
}

export async function getClassified(id: string): Promise<Classified> {
    const res = await fetch(`/api/classifieds/${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error("Classified not found");
    return res.json() as Promise<Classified>;
}

export async function createClassified(data: {
    category: ClassifiedCategory;
    title: string;
    description: string;
    price?: number;
    posterHandle?: string;
}): Promise<Classified> {
    const res = await apiFetch("/api/classifieds", {
        method: "POST",
        body:   JSON.stringify(data),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Failed to create classified");
    }
    return res.json() as Promise<Classified>;
}

export async function updateClassified(id: string, patch: {
    title?: string;
    description?: string;
    price?: number;
}): Promise<Classified> {
    const res = await apiFetch(`/api/classifieds/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body:   JSON.stringify(patch),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Failed to update classified");
    }
    return res.json() as Promise<Classified>;
}

export async function cancelClassified(id: string): Promise<Classified> {
    const res = await apiFetch(`/api/classifieds/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Failed to cancel classified");
    }
    return res.json() as Promise<Classified>;
}

export async function claimClassified(id: string): Promise<Classified> {
    const res = await apiFetch(`/api/classifieds/${encodeURIComponent(id)}/claim`, { method: "POST" });
    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Failed to claim classified");
    }
    return res.json() as Promise<Classified>;
}

// ── Stalls ────────────────────────────────────────────────────────────────────

export type StallCategory = "produce" | "food" | "clothing" | "crafts" | "tools" | "other";
export type StallStatus   = "active" | "inactive";

export interface StallDto {
    id:              string;
    marketplaceId:   string;
    marketplaceName: string;
    holderId:        string;
    holderHandle:    string;
    name:            string;
    description:     string;
    category:        StallCategory;
    stallNumber:     string;
    status:          StallStatus;
    createdAt:       string;
}

export async function listStalls(marketplaceId?: string): Promise<StallDto[]> {
    const qs = marketplaceId ? `?marketplaceId=${encodeURIComponent(marketplaceId)}` : "";
    const res = await fetch(`/api/stalls${qs}`);
    if (!res.ok) throw new Error("Failed to load stalls");
    return res.json() as Promise<StallDto[]>;
}

export async function getStall(id: string): Promise<StallDto> {
    const res = await fetch(`/api/stalls/${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error("Stall not found");
    return res.json() as Promise<StallDto>;
}

export async function createStall(data: {
    marketplaceId:   string;
    marketplaceName: string;
    name:            string;
    description?:    string;
    category:        StallCategory;
    stallNumber?:    string;
    holderHandle?:   string;
}): Promise<StallDto> {
    const res = await apiFetch("/api/stalls", {
        method: "POST",
        body:   JSON.stringify(data),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Failed to create stall");
    }
    return res.json() as Promise<StallDto>;
}

export async function updateStall(id: string, patch: {
    name?: string;
    description?: string;
    category?: StallCategory;
    stallNumber?: string;
    status?: StallStatus;
}): Promise<StallDto> {
    const res = await apiFetch(`/api/stalls/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body:   JSON.stringify(patch),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Failed to update stall");
    }
    return res.json() as Promise<StallDto>;
}

export async function deleteStall(id: string): Promise<void> {
    const res = await apiFetch(`/api/stalls/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Failed to delete stall");
    }
}

// ── Services ──────────────────────────────────────────────────────────────────

export type ServiceCategory    = "plumbing" | "electrical" | "childcare" | "transport" | "cleaning" | "farming" | "construction" | "healthcare" | "education" | "other";
export type ServiceRateUnit    = "per-hour" | "per-job" | "negotiable";
export type ServiceAvailability = "available" | "busy" | "by-appointment";

export interface ServiceProfileDto {
    id:             string;
    providerId:     string;
    providerHandle: string;
    name:           string;
    category:       ServiceCategory;
    description:    string;
    rate:           number | null;
    rateUnit:       ServiceRateUnit;
    availability:   ServiceAvailability;
    createdAt:      string;
    updatedAt:      string;
}

export async function listServices(category?: ServiceCategory): Promise<ServiceProfileDto[]> {
    const qs = category ? `?category=${encodeURIComponent(category)}` : "";
    const res = await fetch(`/api/services${qs}`);
    if (!res.ok) throw new Error("Failed to load services");
    return res.json() as Promise<ServiceProfileDto[]>;
}

export async function getService(id: string): Promise<ServiceProfileDto> {
    const res = await fetch(`/api/services/${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error("Service not found");
    return res.json() as Promise<ServiceProfileDto>;
}

export async function createService(data: {
    name:           string;
    category:       ServiceCategory;
    description?:   string;
    rate?:          number | null;
    rateUnit?:      ServiceRateUnit;
    availability?:  ServiceAvailability;
    providerHandle?: string;
}): Promise<ServiceProfileDto> {
    const res = await apiFetch("/api/services", {
        method: "POST",
        body:   JSON.stringify(data),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Failed to create service");
    }
    return res.json() as Promise<ServiceProfileDto>;
}

export async function updateService(id: string, patch: {
    name?:          string;
    category?:      ServiceCategory;
    description?:   string;
    rate?:          number | null;
    rateUnit?:      ServiceRateUnit;
    availability?:  ServiceAvailability;
}): Promise<ServiceProfileDto> {
    const res = await apiFetch(`/api/services/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body:   JSON.stringify(patch),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Failed to update service");
    }
    return res.json() as Promise<ServiceProfileDto>;
}

export async function deleteService(id: string): Promise<void> {
    const res = await apiFetch(`/api/services/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Failed to delete service");
    }
}

// ── Marketplaces ──────────────────────────────────────────────────────────────

export interface MarketplaceDto {
    id:           string;
    name:         string;
    locationId:   string;
    locationName: string;
    description:  string;
    createdAt:    string;
}

export interface CommunityLocationDto {
    id:      string;
    name:    string;
    address: string;
}

export async function listMarketplaces(): Promise<MarketplaceDto[]> {
    const res = await fetch("/api/marketplaces");
    if (!res.ok) throw new Error("Failed to load marketplaces");
    return res.json() as Promise<MarketplaceDto[]>;
}

export async function getMarketplace(id: string): Promise<MarketplaceDto> {
    const res = await fetch(`/api/marketplaces/${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error("Marketplace not found");
    return res.json() as Promise<MarketplaceDto>;
}

export async function createMarketplace(data: {
    name:         string;
    locationId:   string;
    locationName: string;
    description?: string;
}): Promise<MarketplaceDto> {
    const res = await apiFetch("/api/marketplaces", {
        method: "POST",
        body:   JSON.stringify(data),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Failed to create marketplace");
    }
    return res.json() as Promise<MarketplaceDto>;
}

export async function updateMarketplace(id: string, patch: {
    name?: string;
    locationId?: string;
    locationName?: string;
    description?: string;
}): Promise<MarketplaceDto> {
    const res = await apiFetch(`/api/marketplaces/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body:   JSON.stringify(patch),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Failed to update marketplace");
    }
    return res.json() as Promise<MarketplaceDto>;
}

export async function deleteMarketplace(id: string): Promise<void> {
    const res = await apiFetch(`/api/marketplaces/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Failed to delete marketplace");
    }
}

/** Fetch the community's location list for the marketplace location picker. */
export async function listCommunityLocations(): Promise<CommunityLocationDto[]> {
    try {
        const res = await apiFetch("/api/community/locations");
        if (!res.ok) return [];
        return res.json() as Promise<CommunityLocationDto[]>;
    } catch {
        return [];
    }
}

/** Create a new location in the community app and return the new record. */
export async function createCommunityLocation(data: {
    name: string;
    address: string;
    description?: string;
}): Promise<CommunityLocationDto> {
    const res = await apiFetch("/api/community/locations", {
        method: "POST",
        body:   JSON.stringify(data),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Failed to create location");
    }
    return res.json() as Promise<CommunityLocationDto>;
}

// ── Coordinator / admin ───────────────────────────────────────────────────────

export async function adminCancelClassified(id: string): Promise<Classified> {
    const res = await apiFetch(`/api/admin/classifieds/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Failed to remove classified");
    }
    return res.json() as Promise<Classified>;
}

export async function adminSuspendStall(id: string): Promise<StallDto> {
    const res = await apiFetch(`/api/admin/stalls/${encodeURIComponent(id)}/suspend`, { method: "PATCH" });
    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Failed to suspend stall");
    }
    return res.json() as Promise<StallDto>;
}

export async function adminUnsuspendStall(id: string): Promise<StallDto> {
    const res = await apiFetch(`/api/admin/stalls/${encodeURIComponent(id)}/unsuspend`, { method: "PATCH" });
    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Failed to unsuspend stall");
    }
    return res.json() as Promise<StallDto>;
}
