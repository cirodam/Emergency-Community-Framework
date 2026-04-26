import { Listing, ListingType, createListing } from "./Listing.js";
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

    getBySeller(sellerId: string): Listing[] {
        return this.getAll().filter(l => l.sellerId === sellerId);
    }

    // ── Mutations ─────────────────────────────────────────────────────────────

    add(
        sellerId: string,
        sellerHandle: string,
        type: ListingType,
        title: string,
        description: string,
        price: number,
    ): Listing {
        const listing = createListing(sellerId, sellerHandle, type, title, description, price);
        this.listings.set(listing.id, listing);
        this.loader.save(listing);
        return listing;
    }

    /**
     * Update title, description, or price. Only the seller may do this.
     * Throws if the listing does not exist, is not open, or caller is not the seller.
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
     * Cancel a listing. Only the seller may do this.
     * Throws if the listing does not exist, is not open, or caller is not the seller.
     */
    cancel(id: string, callerId: string): Listing {
        const listing = this.requireOpen(id, callerId);
        listing.status    = "cancelled";
        listing.updatedAt = new Date().toISOString();
        this.loader.save(listing);
        return listing;
    }

    /**
     * Mark a listing as sold. Called by the purchase handler after payment
     * has been confirmed with the bank.
     * Throws if the listing is not open.
     */
    markSold(id: string, buyerId: string): Listing {
        const listing = this.listings.get(id);
        if (!listing)                    throw new Error(`Listing ${id} not found`);
        if (listing.status !== "open")   throw new Error(`Listing ${id} is not open`);
        listing.status    = "sold";
        listing.buyerId   = buyerId;
        listing.updatedAt = new Date().toISOString();
        this.loader.save(listing);
        return listing;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private requireOpen(id: string, callerId: string): Listing {
        const listing = this.listings.get(id);
        if (!listing)                    throw new Error(`Listing ${id} not found`);
        if (listing.sellerId !== callerId) throw new Error("Not your listing");
        if (listing.status !== "open")   throw new Error(`Listing ${id} is not open`);
        return listing;
    }
}
