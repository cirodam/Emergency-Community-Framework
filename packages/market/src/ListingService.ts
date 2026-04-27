import { Listing, ListingSide, ListingType, createListing } from "./Listing.js";
import { ListingLoader } from "./ListingLoader.js";

export interface ListingPatch {
    title?:       string;
    description?: string;
    price?:       number;
}

export class ListingService {
    private static instance: ListingService;
    private listings: Map<string, Listing> = new Map();
    private loader!: ListingLoader;

    private constructor() {}

    static getInstance(): ListingService {
        if (!ListingService.instance) ListingService.instance = new ListingService();
        return ListingService.instance;
    }

    init(loader: ListingLoader): void {
        this.loader = loader;
        for (const listing of loader.loadAll()) {
            this.listings.set(listing.id, listing);
        }
    }

    // ── Queries ───────────────────────────────────────────────────────────────

    get(id: string): Listing | undefined {
        return this.listings.get(id);
    }

    getAll(): Listing[] {
        return Array.from(this.listings.values())
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }

    getOpen(): Listing[] {
        return this.getAll().filter(l => l.status === "open");
    }

    getByPoster(posterId: string): Listing[] {
        return this.getAll().filter(l => l.posterId === posterId);
    }

    // ── Mutations ─────────────────────────────────────────────────────────────

    add(
        side: ListingSide,
        posterId: string,
        posterHandle: string,
        type: ListingType,
        title: string,
        description: string,
        price: number,
    ): Listing {
        const listing = createListing(side, posterId, posterHandle, type, title, description, price);
        this.listings.set(listing.id, listing);
        this.loader.save(listing);
        return listing;
    }

    /**
     * Update title, description, or price. Only the poster may do this.
     */
    update(id: string, callerId: string, patch: ListingPatch): Listing {
        const listing = this.requireOpen(id, callerId);
        if (patch.title       !== undefined) listing.title       = patch.title;
        if (patch.description !== undefined) listing.description = patch.description;
        if (patch.price       !== undefined) listing.price       = patch.price;
        listing.updatedAt = new Date().toISOString();
        this.loader.save(listing);
        return listing;
    }

    /**
     * Cancel a listing. Only the poster may do this.
     */
    cancel(id: string, callerId: string): Listing {
        const listing = this.requireOpen(id, callerId);
        listing.status    = "cancelled";
        listing.updatedAt = new Date().toISOString();
        this.loader.save(listing);
        return listing;
    }

    /**
     * Mark a sell listing as sold (payment already confirmed with bank).
     */
    markSold(id: string, buyerId: string): Listing {
        const listing = this.listings.get(id);
        if (!listing)                  throw new Error(`Listing ${id} not found`);
        if (listing.status !== "open") throw new Error(`Listing ${id} is not open`);
        if (listing.side !== "sell")   throw new Error(`Listing ${id} is not a sell listing`);
        listing.status          = "sold";
        listing.counterpartyId  = buyerId;
        listing.updatedAt       = new Date().toISOString();
        this.loader.save(listing);
        return listing;
    }

    /**
     * Mark a buy listing as filled (payment already confirmed with bank).
     */
    markFilled(id: string, fulfillerId: string): Listing {
        const listing = this.listings.get(id);
        if (!listing)                  throw new Error(`Listing ${id} not found`);
        if (listing.status !== "open") throw new Error(`Listing ${id} is not open`);
        if (listing.side !== "buy")    throw new Error(`Listing ${id} is not a buy listing`);
        listing.status         = "filled";
        listing.counterpartyId = fulfillerId;
        listing.updatedAt      = new Date().toISOString();
        this.loader.save(listing);
        return listing;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private requireOpen(id: string, callerId: string): Listing {
        const listing = this.listings.get(id);
        if (!listing)                     throw new Error(`Listing ${id} not found`);
        if (listing.posterId !== callerId) throw new Error("Not your listing");
        if (listing.status !== "open")    throw new Error(`Listing ${id} is not open`);
        return listing;
    }
}
