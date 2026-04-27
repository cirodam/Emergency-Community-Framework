import { writable } from "svelte/store";

export type Page =
    | "classifieds"
    | "stalls"
    | "stall"
    | "services"
    | "marketplaces"
    | "marketplace";

export const currentPage           = writable<Page>("classifieds");
export const selectedMarketplaceId = writable<string | null>(null);
export const selectedStallId       = writable<string | null>(null);
