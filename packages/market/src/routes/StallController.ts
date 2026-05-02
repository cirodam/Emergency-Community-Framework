import { Request, Response } from "express";
import { StallService } from "../StallService.js";
import { STALL_CATEGORIES, StallCategory, type Stall } from "../Stall.js";
import type { PersonCredential } from "@ecf/core";

const svc = () => StallService.getInstance();

/** Strip internal holderId from stall responses. */
function toDto(s: Stall) {
    const { holderId: _h, ...rest } = s;
    return rest;
}

// GET /api/stalls?marketplaceId=...
export function listStalls(req: Request, res: Response): void {
    const { marketplaceId } = req.query;
    const results = marketplaceId
        ? svc().getByMarketplace(marketplaceId as string)
        : svc().getAll();
    res.json(results.map(toDto));
}

// GET /api/stalls/:id
export function getStall(req: Request, res: Response): void {
    const s = svc().get(req.params.id as string);
    if (!s) { res.status(404).json({ error: "Stall not found" }); return; }
    res.json(toDto(s));
}

// POST /api/stalls
// Body: { marketplaceId, marketplaceName, name, description?, category, stallNumber? }
export function createStall(req: Request & { personId?: string }, res: Response): void {
    const { marketplaceId, marketplaceName, name, description, category, stallNumber } = req.body ?? {};
    const holderId = req.personId;

    if (!holderId) { res.status(401).json({ error: "Not authenticated" }); return; }
    if (typeof marketplaceId !== "string" || !marketplaceId.trim()) {
        res.status(400).json({ error: "marketplaceId is required" }); return;
    }
    if (typeof marketplaceName !== "string" || !marketplaceName.trim()) {
        res.status(400).json({ error: "marketplaceName is required" }); return;
    }
    if (typeof name !== "string" || !name.trim()) {
        res.status(400).json({ error: "name is required" }); return;
    }
    if (!STALL_CATEGORIES.includes(category)) {
        res.status(400).json({ error: `category must be one of: ${STALL_CATEGORIES.join(", ")}` }); return;
    }

    // holderHandle is read from the credential — not trusted from body
    const holderHandle = (req as Request & { personId?: string; credential?: PersonCredential }).credential?.handle ?? "";

    const s = svc().add(
        marketplaceId.trim(),
        marketplaceName.trim(),
        holderId,
        typeof (req.body?.holderHandle) === "string" ? req.body.holderHandle : holderHandle,
        name.trim(),
        typeof description === "string" ? description.trim() : "",
        category as StallCategory,
        typeof stallNumber === "string" ? stallNumber.trim() : "",
    );
    res.status(201).json(toDto(s));
}

// PATCH /api/stalls/:id
export function updateStall(req: Request & { personId?: string }, res: Response): void {
    const { name, description, category, stallNumber, status, marketplaceName } = req.body ?? {};
    const patch: Record<string, unknown> = {};

    if (name            !== undefined) patch.name            = name;
    if (description     !== undefined) patch.description     = description;
    if (marketplaceName !== undefined) patch.marketplaceName = marketplaceName;
    if (stallNumber     !== undefined) patch.stallNumber     = stallNumber;
    if (status          !== undefined) patch.status          = status;
    if (category        !== undefined) {
        if (!STALL_CATEGORIES.includes(category)) {
            res.status(400).json({ error: `category must be one of: ${STALL_CATEGORIES.join(", ")}` }); return;
        }
        patch.category = category;
    }

    try {
        res.json(toDto(svc().update(req.params.id as string, patch)));
    } catch (err) {
        res.status(404).json({ error: (err as Error).message });
    }
}

// DELETE /api/stalls/:id
export function deleteStall(req: Request & { personId?: string }, res: Response): void {
    const deleted = svc().delete(req.params.id as string);
    if (!deleted) { res.status(404).json({ error: "Stall not found" }); return; }
    res.status(204).send();
}

// PATCH /api/admin/stalls/:id/suspend — coordinator/admin: suspend any stall
export function adminSuspendStall(req: Request, res: Response): void {
    try {
        res.json(toDto(svc().adminSetStatus(req.params.id as string, "inactive")));
    } catch (err) {
        res.status(404).json({ error: (err as Error).message });
    }
}

// PATCH /api/admin/stalls/:id/unsuspend — coordinator/admin: reactivate any stall
export function adminUnsuspendStall(req: Request, res: Response): void {
    try {
        res.json(toDto(svc().adminSetStatus(req.params.id as string, "active")));
    } catch (err) {
        res.status(404).json({ error: (err as Error).message });
    }
}
