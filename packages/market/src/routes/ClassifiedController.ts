import { Request, Response } from "express";
import { ClassifiedService } from "../ClassifiedService.js";
import { BankClient } from "@ecf/core";
import { NodeService, type PersonCredential } from "@ecf/core";
import { ClassifiedCategory } from "../Classified.js";

const BANK_URL = process.env.BANK_URL ?? "http://localhost:3001";

function bank(): BankClient {
    return new BankClient(
        BANK_URL,
        body => NodeService.getInstance().getSigner().signBody(body),
    );
}

const VALID_CATEGORIES: ClassifiedCategory[] = ["for-sale", "wanted", "free", "job", "notice"];

const svc = () => ClassifiedService.getInstance();

// GET /api/classifieds/mine  — returns all listings by the authenticated caller
export function listMyClassifieds(req: Request & { personId?: string }, res: Response): void {
    const posterId = req.personId;
    if (!posterId) { res.status(401).json({ error: "Not authenticated" }); return; }
    res.json(svc().getByPoster(posterId));
}

// GET /api/classifieds?category=for-sale|wanted|free|job|notice&status=open&page=1&limit=20
export function listClassifieds(req: Request, res: Response): void {
    const { category, status } = req.query;
    const cat = VALID_CATEGORIES.includes(category as ClassifiedCategory)
        ? (category as ClassifiedCategory)
        : undefined;

    const all = (status === "all")
        ? svc().getAll()
        : svc().getOpen(cat);

    const results = (!status || status === "open") && !cat
        ? svc().getOpen()
        : all;

    const limit  = Math.min(Math.max(parseInt(req.query.limit as string) || 20, 1), 100);
    const page   = Math.max(parseInt(req.query.page  as string) || 1, 1);
    const total  = results.length;
    const pages  = Math.max(Math.ceil(total / limit), 1);
    const offset = (Math.min(page, pages) - 1) * limit;

    res.json({
        items: results.slice(offset, offset + limit),
        total,
        page:  Math.min(page, pages),
        pages,
    });
}

// GET /api/classifieds/:id
export function getClassified(req: Request, res: Response): void {
    const c = svc().get(req.params.id as string);
    if (!c) { res.status(404).json({ error: "Classified not found" }); return; }
    res.json(c);
}

// POST /api/classifieds
// Body: { category, title, description, price? }
export function createClassified(req: Request & { personId?: string; credential?: PersonCredential }, res: Response): void {
    const { category, title, description, price } = req.body ?? {};
    const posterId = req.personId;

    if (!posterId) { res.status(401).json({ error: "Not authenticated" }); return; }
    if (!VALID_CATEGORIES.includes(category)) {
        res.status(400).json({ error: `category must be one of: ${VALID_CATEGORIES.join(", ")}` }); return;
    }
    if (typeof title !== "string" || !title.trim()) {
        res.status(400).json({ error: "title is required" }); return;
    }
    if (title.length > 200) {
        res.status(400).json({ error: "title must be 200 characters or fewer" }); return;
    }
    if (typeof description !== "string") {
        res.status(400).json({ error: "description is required" }); return;
    }
    if (description.length > 4000) {
        res.status(400).json({ error: "description must be 4000 characters or fewer" }); return;
    }
    const resolvedPrice = (category === "free" || category === "job" || category === "notice")
        ? 0
        : (typeof price === "number" && Number.isFinite(price) && price >= 0 ? price : 0);

    const c = svc().add(
        posterId,
        req.credential?.handle ?? "",
        category,
        title.trim(),
        description,
        resolvedPrice,
    );
    res.status(201).json(c);
}

// POST /api/classifieds (uses posterHandle from credential)
export function createClassifiedWithHandle(req: Request & { personId?: string; credential?: PersonCredential }, res: Response): void {
    const { category, title, description, price } = req.body ?? {};
    const posterId = req.personId;

    if (!posterId) { res.status(401).json({ error: "Not authenticated" }); return; }
    if (!VALID_CATEGORIES.includes(category)) {
        res.status(400).json({ error: `category must be one of: ${VALID_CATEGORIES.join(", ")}` }); return;
    }
    if (typeof title !== "string" || !title.trim()) {
        res.status(400).json({ error: "title is required" }); return;
    }
    if (title.length > 200) {
        res.status(400).json({ error: "title must be 200 characters or fewer" }); return;
    }
    if (typeof description !== "string") {
        res.status(400).json({ error: "description is required" }); return;
    }
    if (description.length > 4000) {
        res.status(400).json({ error: "description must be 4000 characters or fewer" }); return;
    }
    const resolvedPrice = (category === "free" || category === "job" || category === "notice")
        ? 0
        : (typeof price === "number" && Number.isFinite(price) && price >= 0 ? price : 0);

    const c = svc().add(
        posterId,
        req.credential?.handle ?? "",
        category,
        title.trim(),
        description,
        resolvedPrice,
    );
    res.status(201).json(c);
}

// PATCH /api/classifieds/:id
export function updateClassified(req: Request & { personId?: string }, res: Response): void {
    const callerId = req.personId;
    if (!callerId) { res.status(401).json({ error: "Not authenticated" }); return; }

    const { title, description, price } = req.body ?? {};
    const patch: { title?: string; description?: string; price?: number } = {};
    if (title       !== undefined) patch.title       = title;
    if (description !== undefined) patch.description = description;
    if (price !== undefined) {
        if (typeof price !== "number" || !Number.isFinite(price) || price < 0) {
            res.status(400).json({ error: "price must be a non-negative finite number" }); return;
        }
        patch.price = price;
    }

    try {
        res.json(svc().update(req.params.id as string, callerId, patch));
    } catch (err) {
        const msg = (err as Error).message;
        const status = msg.includes("not found") ? 404 : msg.includes("Not your") ? 403 : 422;
        res.status(status).json({ error: msg });
    }
}

// DELETE /api/classifieds/:id
export function cancelClassified(req: Request & { personId?: string }, res: Response): void {
    const callerId = req.personId;
    if (!callerId) { res.status(401).json({ error: "Not authenticated" }); return; }

    try {
        res.json(svc().cancel(req.params.id as string, callerId));
    } catch (err) {
        const msg = (err as Error).message;
        const status = msg.includes("not found") ? 404 : msg.includes("Not your") ? 403 : 422;
        res.status(status).json({ error: msg });
    }
}

// POST /api/classifieds/:id/claim
// For "for-sale": claimant pays poster. For "wanted": poster pays claimant.
// For "free"/"job"/"notice": just closes it (no payment).
export async function claimClassified(
    req: Request & { personId?: string },
    res: Response,
): Promise<void> {
    const claimantId = req.personId;
    if (!claimantId) { res.status(401).json({ error: "Not authenticated" }); return; }

    const c = svc().get(req.params.id as string);
    if (!c)                   { res.status(404).json({ error: "Classified not found" }); return; }
    if (c.status !== "open")  { res.status(422).json({ error: "Classified is not open" }); return; }
    if (c.posterId === claimantId) { res.status(422).json({ error: "Cannot claim your own classified" }); return; }

    // No payment needed for free/job/notice or zero-price ads
    if (c.price <= 0 || c.category === "free" || c.category === "job" || c.category === "notice") {
        res.json(svc().markClosed(c.id, claimantId));
        return;
    }

    const b = bank();

    if (c.category === "for-sale") {
        // Claimant pays poster
        const [buyerAccount, sellerAccount] = await Promise.all([
            b.getPrimaryAccountAsync(claimantId),
            b.getPrimaryAccountAsync(c.posterId),
        ]);
        if (!buyerAccount)  { res.status(422).json({ error: "You have no bank account" }); return; }
        if (!sellerAccount) { res.status(422).json({ error: "Poster has no bank account" }); return; }
        try {
            await b.transfer(buyerAccount.accountId, sellerAccount.accountId, c.price, `classified: ${c.title}`);
        } catch (err) {
            res.status(422).json({ error: `Payment failed: ${(err as Error).message}` }); return;
        }
    } else if (c.category === "wanted") {
        // Poster pays claimant (fulfillment)
        const [posterAccount, claimantAccount] = await Promise.all([
            b.getPrimaryAccountAsync(c.posterId),
            b.getPrimaryAccountAsync(claimantId),
        ]);
        if (!posterAccount)   { res.status(422).json({ error: "Poster has no bank account" }); return; }
        if (!claimantAccount) { res.status(422).json({ error: "You have no bank account" }); return; }
        try {
            await b.transfer(posterAccount.accountId, claimantAccount.accountId, c.price, `wanted: ${c.title}`);
        } catch (err) {
            res.status(422).json({ error: `Payment failed: ${(err as Error).message}` }); return;
        }
    }

    res.json(svc().markClosed(c.id, claimantId));
}

// DELETE /api/admin/classifieds/:id — coordinator/admin: cancel any listing
export function adminCancelClassified(req: Request, res: Response): void {
    try {
        res.json(ClassifiedService.getInstance().adminCancel(req.params.id as string));
    } catch (err) {
        const msg = (err as Error).message;
        res.status(msg.includes("not found") ? 404 : 422).json({ error: msg });
    }
}
