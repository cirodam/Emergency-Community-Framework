import { Request, Response } from "express";
import { PersonCredential } from "@ecf/core";
import { MarketplaceService } from "../MarketplaceService.js";
import { Marketplace } from "../Marketplace.js";

type AuthedRequest = Request & { personId?: string; credential?: PersonCredential };

const svc = () => MarketplaceService.getInstance();

function toDto(m: Marketplace) {
    return {
        id:           m.id,
        name:         m.name,
        locationId:   m.locationId,
        locationName: m.locationName,
        description:  m.description,
        createdAt:    m.createdAt,
    };
}

// GET /api/marketplaces
export function listMarketplaces(_req: Request, res: Response): void {
    res.json(svc().getAll().map(toDto));
}

// GET /api/marketplaces/:id
export function getMarketplace(req: Request, res: Response): void {
    const m = svc().get(req.params.id as string);
    if (!m) { res.status(404).json({ error: "Marketplace not found" }); return; }
    res.json(toDto(m));
}

// POST /api/marketplaces
// Body: { name, locationId, locationName, description? }
export function createMarketplace(req: AuthedRequest, res: Response): void {
    const { name, locationId, locationName, description } = req.body ?? {};

    if (typeof name !== "string" || !name.trim()) {
        res.status(400).json({ error: "name is required" }); return;
    }
    if (typeof locationId !== "string" || !locationId.trim()) {
        res.status(400).json({ error: "locationId is required" }); return;
    }
    if (typeof locationName !== "string" || !locationName.trim()) {
        res.status(400).json({ error: "locationName is required" }); return;
    }

    const m = svc().add(
        name.trim(),
        locationId.trim(),
        locationName.trim(),
        typeof description === "string" ? description.trim() : "",
    );
    res.status(201).json(toDto(m));
}

// PATCH /api/marketplaces/:id
// Body: { name?, locationId?, locationName?, description? }
export function updateMarketplace(req: AuthedRequest, res: Response): void {
    const { name, locationId, locationName, description } = req.body ?? {};
    const patch: Record<string, string> = {};

    if (name         !== undefined) {
        if (typeof name !== "string" || !name.trim()) {
            res.status(400).json({ error: "name must be a non-empty string" }); return;
        }
        patch.name = name.trim();
    }
    if (locationId   !== undefined) {
        if (typeof locationId !== "string" || !locationId.trim()) {
            res.status(400).json({ error: "locationId must be a non-empty string" }); return;
        }
        patch.locationId = locationId.trim();
    }
    if (locationName !== undefined) {
        if (typeof locationName !== "string" || !locationName.trim()) {
            res.status(400).json({ error: "locationName must be a non-empty string" }); return;
        }
        patch.locationName = locationName.trim();
    }
    if (description  !== undefined) {
        if (typeof description !== "string") {
            res.status(400).json({ error: "description must be a string" }); return;
        }
        patch.description = description.trim();
    }

    try {
        const m = svc().update(req.params.id as string, patch);
        res.json(toDto(m));
    } catch (err) {
        res.status(404).json({ error: (err as Error).message });
    }
}

// DELETE /api/marketplaces/:id
export function deleteMarketplace(req: AuthedRequest, res: Response): void {
    const deleted = svc().delete(req.params.id as string);
    if (!deleted) { res.status(404).json({ error: "Marketplace not found" }); return; }
    res.status(204).send();
}
