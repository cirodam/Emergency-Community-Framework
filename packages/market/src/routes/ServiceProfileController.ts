import { Request, Response } from "express";
import { ServiceProfileService } from "../ServiceProfileService.js";
import { SERVICE_CATEGORIES, ServiceCategory, ServiceRateUnit, ServiceAvailability } from "../ServiceProfile.js";
import { type PersonCredential } from "@ecf/core";

const VALID_RATE_UNITS: ServiceRateUnit[]     = ["per-hour", "per-job", "negotiable"];
const VALID_AVAILABILITY: ServiceAvailability[] = ["available", "busy", "by-appointment"];

const svc = () => ServiceProfileService.getInstance();

// GET /api/services?category=...
export function listServices(req: Request, res: Response): void {
    const { category } = req.query;
    const results = SERVICE_CATEGORIES.includes(category as ServiceCategory)
        ? svc().getByCategory(category as ServiceCategory)
        : svc().getAll();
    res.json(results);
}

// GET /api/services/:id
export function getService(req: Request, res: Response): void {
    const p = svc().get(req.params.id as string);
    if (!p) { res.status(404).json({ error: "Service profile not found" }); return; }
    res.json(p);
}

// POST /api/services
// Body: { name, category, description?, rate?, rateUnit?, availability? }
export function createService(req: Request & { personId?: string; credential?: PersonCredential }, res: Response): void {
    const { name, category, description, rate, rateUnit, availability } = req.body ?? {};
    const providerId = req.personId;

    if (!providerId) { res.status(401).json({ error: "Not authenticated" }); return; }
    if (typeof name !== "string" || !name.trim()) {
        res.status(400).json({ error: "name is required" }); return;
    }
    if (name.length > 200) {
        res.status(400).json({ error: "name must be 200 characters or fewer" }); return;
    }
    if (!SERVICE_CATEGORIES.includes(category)) {
        res.status(400).json({ error: `category must be one of: ${SERVICE_CATEGORIES.join(", ")}` }); return;
    }
    if (description !== undefined && typeof description === "string" && description.length > 4000) {
        res.status(400).json({ error: "description must be 4000 characters or fewer" }); return;
    }
    const resolvedRateUnit: ServiceRateUnit = VALID_RATE_UNITS.includes(rateUnit) ? rateUnit : "negotiable";
    const resolvedAvailability: ServiceAvailability = VALID_AVAILABILITY.includes(availability) ? availability : "available";
    const resolvedRate = typeof rate === "number" && Number.isFinite(rate) && rate >= 0 ? rate : null;

    const p = svc().add(
        providerId,
        req.credential?.handle ?? "",
        name.trim(),
        category as ServiceCategory,
        typeof description === "string" ? description.trim() : "",
        resolvedRate,
        resolvedRateUnit,
        resolvedAvailability,
    );
    res.status(201).json(p);
}

// PATCH /api/services/:id
export function updateService(req: Request & { personId?: string }, res: Response): void {
    const callerId = req.personId;
    if (!callerId) { res.status(401).json({ error: "Not authenticated" }); return; }

    const { name, category, description, rate, rateUnit, availability } = req.body ?? {};
    const patch: Record<string, unknown> = {};
    if (name         !== undefined) patch.name         = name;
    if (category     !== undefined) {
        if (!SERVICE_CATEGORIES.includes(category)) {
            res.status(400).json({ error: `category must be one of: ${SERVICE_CATEGORIES.join(", ")}` }); return;
        }
        patch.category = category;
    }
    if (description  !== undefined) patch.description  = description;
    if (rate !== undefined) {
        if (typeof rate !== "number" || !Number.isFinite(rate) || rate < 0) {
            res.status(400).json({ error: "rate must be a non-negative finite number" }); return;
        }
        patch.rate = rate;
    }
    if (rateUnit     !== undefined) {
        if (!VALID_RATE_UNITS.includes(rateUnit)) {
            res.status(400).json({ error: `rateUnit must be one of: ${VALID_RATE_UNITS.join(", ")}` }); return;
        }
        patch.rateUnit = rateUnit;
    }
    if (availability !== undefined) {
        if (!VALID_AVAILABILITY.includes(availability)) {
            res.status(400).json({ error: `availability must be one of: ${VALID_AVAILABILITY.join(", ")}` }); return;
        }
        patch.availability = availability;
    }

    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        res.json(svc().update(req.params.id as string, callerId, patch as any));
    } catch (err) {
        const msg = (err as Error).message;
        const status = msg.includes("not found") ? 404 : msg.includes("Not your") ? 403 : 422;
        res.status(status).json({ error: msg });
    }
}

// DELETE /api/services/:id
export function deleteService(req: Request & { personId?: string }, res: Response): void {
    const callerId = req.personId;
    if (!callerId) { res.status(401).json({ error: "Not authenticated" }); return; }

    try {
        svc().delete(req.params.id as string, callerId);
        res.status(204).send();
    } catch (err) {
        const msg = (err as Error).message;
        const status = msg.includes("not found") ? 404 : msg.includes("Not your") ? 403 : 422;
        res.status(status).json({ error: msg });
    }
}
