import { Request, Response } from "express";
import { AppSuspensionService } from "../person/AppSuspensionService.js";
import { PersonService } from "../person/PersonService.js";
import type { AuthedRequest } from "@ecf/core";

const KNOWN_APPS = ["bank", "market", "mail"];

function svc(): AppSuspensionService { return AppSuspensionService.getInstance(); }

// GET /api/app-suspensions — public, used by satellite apps to populate their cache
export function listSuspensions(_req: Request, res: Response): void {
    res.json(svc().getAll().map(s => ({ personId: s.personId, app: s.app })));
}

// GET /api/app-suspensions/full — steward only, full detail
export function listSuspensionsFull(_req: Request, res: Response): void {
    res.json(svc().getAll());
}

// GET /api/persons/:handle/app-suspensions — steward, per-person
export function listPersonSuspensions(req: Request, res: Response): void {
    const person = PersonService.getInstance().getByHandle(req.params.handle as string);
    if (!person) { res.status(404).json({ error: "Person not found" }); return; }
    res.json(svc().getForPerson(person.id));
}

// POST /api/persons/:handle/app-suspensions
// Body: { app, reason }
export function suspendFromApp(req: Request, res: Response): void {
    const person = PersonService.getInstance().getByHandle(req.params.handle as string);
    if (!person) { res.status(404).json({ error: "Person not found" }); return; }
    const { app, reason } = req.body ?? {};
    if (typeof app !== "string" || !KNOWN_APPS.includes(app)) {
        res.status(400).json({ error: `app must be one of: ${KNOWN_APPS.join(", ")}` }); return;
    }
    const suspendedBy = (req as AuthedRequest).personId;
    const suspension = svc().suspend(person.id, app, reason ?? "", suspendedBy);
    res.status(201).json(suspension);
}

// DELETE /api/persons/:handle/app-suspensions/:app
export function unsuspendFromApp(req: Request, res: Response): void {
    const person = PersonService.getInstance().getByHandle(req.params.handle as string);
    if (!person) { res.status(404).json({ error: "Person not found" }); return; }
    const { app } = req.params as { app: string };
    const removed = svc().unsuspend(person.id, app);
    if (!removed) { res.status(404).json({ error: "No suspension found for this person and app" }); return; }
    res.status(204).end();
}
