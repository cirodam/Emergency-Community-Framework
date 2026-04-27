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
    createdAt:    string;
    updatedAt:    string;
}

export function createServiceProfile(
    providerId: string,
    providerHandle: string,
    name: string,
    category: ServiceCategory,
    description: string,
    rate: number | null,
    rateUnit: ServiceRateUnit,
    availability: ServiceAvailability,
): ServiceProfile {
    const now = new Date().toISOString();
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
        createdAt: now,
        updatedAt: now,
    };
}

export const SERVICE_CATEGORIES: ServiceCategory[] = [
    "plumbing", "electrical", "childcare", "transport", "cleaning",
    "farming", "construction", "healthcare", "education", "other",
];
