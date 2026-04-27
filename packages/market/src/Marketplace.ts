import { randomUUID } from "crypto";

export interface Marketplace {
    id:           string;
    name:         string;
    locationId:   string;    // ID of a community Location record
    locationName: string;    // denormalized for display — avoids cross-service fetch at read time
    description:  string;
    createdAt:    string;    // ISO 8601
}

export function createMarketplace(
    name: string,
    locationId: string,
    locationName: string,
    description: string,
): Marketplace {
    return {
        id:           randomUUID(),
        name,
        locationId,
        locationName,
        description,
        createdAt:    new Date().toISOString(),
    };
}
