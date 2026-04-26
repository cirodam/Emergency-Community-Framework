import { Request, Response } from "express";
import { ListingService } from "../ListingService.js";
import { BankClient } from "../BankClient.js";
import { NodeService } from "@ecf/core";

const BANK_URL = process.env.BANK_URL ?? "http://localhost:3001";

function bank(): BankClient {
    return new BankClient(
        BANK_URL,
        body => NodeService.getInstance().getSigner().signBody(body),
    );
}

function svc(): ListingService {
    return ListingService.getInstance();
}

function toDto(l: ReturnType<ListingService["get"]>) {
    return l;
}

// GET /api/listings?type=item|service&status=open
export function listListings(req: Request, res: Response): void {
    const { type, status } = req.query;
    let results = status === "open" || status === undefined
        ? svc().getOpen()
        : svc().getAll();

    if (type === "item" || type === "service") {
        results = results.filter(l => l.type === type);
    }
    res.json(results.map(toDto));
}

// GET /api/listings/:id
export function getListing(req: Request, res: Response): void {
    const listing = svc().get(req.params.id as string);
    if (!listing) { res.status(404).json({ error: "Listing not found" }); return; }
    res.json(toDto(listing));
}

// POST /api/listings
// Body: { type, title, description, price, sellerHandle? }
export function createListing(req: Request & { personId?: string }, res: Response): void {
    const { type, title, description, price, sellerHandle } = req.body ?? {};
    const sellerId = req.personId;

    if (!sellerId) { res.status(401).json({ error: "Not authenticated" }); return; }
    if (type !== "item" && type !== "service") {
        res.status(400).json({ error: "type must be 'item' or 'service'" }); return;
    }
    if (typeof title !== "string" || !title.trim()) {
        res.status(400).json({ error: "title is required" }); return;
    }
    if (typeof description !== "string") {
        res.status(400).json({ error: "description is required" }); return;
    }
    if (typeof price !== "number" || price < 0) {
        res.status(400).json({ error: "price must be a non-negative number" }); return;
    }

    const listing = svc().add(
        sellerId,
        typeof sellerHandle === "string" ? sellerHandle : "",
        type,
        title.trim(),
        description,
        price,
    );
    res.status(201).json(toDto(listing));
}

// PATCH /api/listings/:id
// Body: { title?, description?, price? }
export function updateListing(req: Request & { personId?: string }, res: Response): void {
    const callerId = req.personId;
    if (!callerId) { res.status(401).json({ error: "Not authenticated" }); return; }

    const { title, description, price } = req.body ?? {};
    const patch: { title?: string; description?: string; price?: number } = {};
    if (title       !== undefined) patch.title       = title;
    if (description !== undefined) patch.description = description;
    if (price       !== undefined) patch.price       = price;

    try {
        const listing = svc().update(req.params.id as string, callerId, patch);
        res.json(toDto(listing));
    } catch (err) {
        const msg = (err as Error).message;
        const status = msg.includes("not found") ? 404 : msg.includes("Not your") ? 403 : 422;
        res.status(status).json({ error: msg });
    }
}

// DELETE /api/listings/:id
export function cancelListing(req: Request & { personId?: string }, res: Response): void {
    const callerId = req.personId;
    if (!callerId) { res.status(401).json({ error: "Not authenticated" }); return; }

    try {
        const listing = svc().cancel(req.params.id as string, callerId);
        res.json(toDto(listing));
    } catch (err) {
        const msg = (err as Error).message;
        const status = msg.includes("not found") ? 404 : msg.includes("Not your") ? 403 : 422;
        res.status(status).json({ error: msg });
    }
}

// POST /api/listings/:id/purchase
// Transfers kin from buyer to seller, then marks the listing sold.
export async function purchaseListing(
    req: Request & { personId?: string },
    res: Response,
): Promise<void> {
    const buyerId = req.personId;
    if (!buyerId) { res.status(401).json({ error: "Not authenticated" }); return; }

    const listing = svc().get(req.params.id as string);
    if (!listing)                   { res.status(404).json({ error: "Listing not found" }); return; }
    if (listing.status !== "open")  { res.status(422).json({ error: "Listing is not open" }); return; }
    if (listing.sellerId === buyerId) { res.status(422).json({ error: "Cannot purchase your own listing" }); return; }

    const b = bank();

    const [buyerAccount, sellerAccount] = await Promise.all([
        b.getPrimaryAccountAsync(buyerId),
        b.getPrimaryAccountAsync(listing.sellerId),
    ]);

    if (!buyerAccount)  { res.status(422).json({ error: "Buyer has no bank account" }); return; }
    if (!sellerAccount) { res.status(422).json({ error: "Seller has no bank account" }); return; }

    if (listing.price > 0) {
        try {
            await b.transfer(
                buyerAccount.accountId,
                sellerAccount.accountId,
                listing.price,
                `purchase: ${listing.title}`,
            );
        } catch (err) {
            res.status(422).json({ error: `Payment failed: ${(err as Error).message}` });
            return;
        }
    }

    const sold = svc().markSold(listing.id, buyerId);
    res.json(toDto(sold));
}
