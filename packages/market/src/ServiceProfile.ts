import { randomUUID } from "crypto";

export type ServiceCategory    = "plumbing" | "electrical" | "childcare" | "transport" | "cleaning" | "farming" | "construction" | "healthcare" | "education" | "other";
export type ServiceRateUnit    = "per-hour" | "per-job" | "negotiable";
export type ServiceAvailability = "available" | "busy" | "by-appointment";

export interface ServiceProfile {
    id:           string;
    providerId:   string;
    providerHandle: string;
    name:         string;          // e.g. "Tyler's Plumbing"
    category:     ServiceCategory;
    description:  string;
    rate:         number | null;   // null if negotiable or free
    rateUnit:     ServiceRateUnit;
    availability: ServiceAvailability;
    expiresAt:    string;
    createdAt:    string;
    updatedAt:    string;
}

export const SERVICE_TTL_DAYS = 180;

export function createServiceProfile(
    providerId: string,
    providerHandle: string,
    name: string,
    category: ServiceCategory,
    description: string,
    rate: number | null,
    rateUnit: ServiceRateUnit,
    availability: ServiceAvailability,
    ttlDays: number = SERVICE_TTL_DAYS,
): ServiceProfile {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlDays * 24 * 60 * 60 * 1000).toISOString();
    return {
        id: randomUUID(),
        providerId,
        providerHandle,
        name,
        category,
        description,
        rate,
        rateUnit,
        availability,
        expiresAt,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
    };
}

export const SERVICE_CATEGORIES: ServiceCategory[] = [
    "plumbing", "electrical", "childcare", "transport", "cleaning",
    "farming", "construction", "healthcare", "education", "other",
];
