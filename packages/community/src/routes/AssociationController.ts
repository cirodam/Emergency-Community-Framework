import { Request, Response } from "express";
import { AssociationService } from "../association/AssociationService.js";
import { Association } from "../association/Association.js";
import { HandleRegistry } from "../HandleRegistry.js";
import { PersonService } from "../person/PersonService.js";

type AuthedRequest = Request & { personId?: string };

const svc = () => AssociationService.getInstance();
const ppl = () => PersonService.getInstance();

function resolveHandle(personId: string): string {
    return ppl().get(personId)?.handle ?? personId;
}

function toDto(a: Association) {
    return {
        id:             a.id,
        name:           a.name,
        handle:         a.handle,
        description:    a.description,
        active:         a.active,
        memberHandles:  a.memberIds.map(resolveHandle),
        adminHandles:   a.adminIds.map(resolveHandle),
        memberCount:    a.memberIds.length,
        registeredAt:   a.registeredAt,
    };
}

// GET /api/associations
export function listAssociations(_req: Request, res: Response): void {
    res.json(svc().getAll().map(toDto));
}

// GET /api/associations/:id
export function getAssociation(req: Request, res: Response): void {
    const a = svc().getById(req.params.id as string)
           ?? svc().getByHandle(req.params.id as string);
    if (!a) { res.status(404).json({ error: "Association not found" }); return; }
    res.json(toDto(a));
}

// POST /api/associations
// Body: { name, handle, description? }
// Requires auth — creator becomes first admin
export function createAssociation(req: AuthedRequest, res: Response): void {
    const personId = req.personId;
    if (!personId) { res.status(401).json({ error: "Authentication required" }); return; }

    const { name, handle, description } = req.body ?? {};
    if (typeof name !== "string" || !name.trim()) {
        res.status(400).json({ error: "name is required" }); return;
    }
    if (typeof handle !== "string" || !handle.trim()) {
        res.status(400).json({ error: "handle is required" }); return;
    }

    const slug = handle.toLowerCase().replace(/[^a-z0-9_]/g, "_");
    if (HandleRegistry.getInstance().isTaken(slug)) {
        res.status(409).json({ error: `Handle "${slug}" is already taken` }); return;
    }

    const a = new Association(name.trim(), slug, typeof description === "string" ? description.trim() : "");
    a.addAdmin(personId);   // creator starts as first admin and member
    svc().create(a);
    res.status(201).json(toDto(a));
}

// PATCH /api/associations/:id
// Body: { name?, description? }
// Requires auth + must be an admin
export function updateAssociation(req: AuthedRequest, res: Response): void {
    const personId = req.personId;
    if (!personId) { res.status(401).json({ error: "Authentication required" }); return; }

    const a = svc().getById(req.params.id as string);
    if (!a) { res.status(404).json({ error: "Association not found" }); return; }
    if (!a.isAdmin(personId)) { res.status(403).json({ error: "Only admins can edit this association" }); return; }

    const { name, description } = req.body ?? {};
    if (typeof name === "string" && name.trim()) a.name = name.trim();
    if (typeof description === "string")         a.description = description.trim();
    svc().save(a);
    res.json(toDto(a));
}

// POST /api/associations/:id/members
// Body: { handle }
// Requires auth + must be an admin
export function addMember(req: AuthedRequest, res: Response): void {
    const actorId = req.personId;
    if (!actorId) { res.status(401).json({ error: "Authentication required" }); return; }

    const a = svc().getById(req.params.id as string);
    if (!a) { res.status(404).json({ error: "Association not found" }); return; }
    if (!a.isAdmin(actorId)) { res.status(403).json({ error: "Only admins can manage members" }); return; }

    const { handle } = req.body ?? {};
    if (typeof handle !== "string" || !handle) {
        res.status(400).json({ error: "handle is required" }); return;
    }
    const target = ppl().getByHandle(handle);
    if (!target) { res.status(404).json({ error: "Person not found" }); return; }

    const updated = svc().addMember(a.id, target.id);
    res.status(201).json(toDto(updated!));
}

// DELETE /api/associations/:id/members/:handle
// Requires auth + must be an admin (or the member removing themselves)
export function removeMember(req: AuthedRequest, res: Response): void {
    const actorId = req.personId;
    if (!actorId) { res.status(401).json({ error: "Authentication required" }); return; }

    const a = svc().getById(req.params.id as string);
    if (!a) { res.status(404).json({ error: "Association not found" }); return; }

    const target = ppl().getByHandle(req.params.handle as string);
    if (!target) { res.status(404).json({ error: "Person not found" }); return; }
    const isSelf = actorId === target.id;
    if (!isSelf && !a.isAdmin(actorId)) {
        res.status(403).json({ error: "Only admins can remove other members" }); return;
    }

    const updated = svc().removeMember(a.id, target.id);
    if (!updated) { res.status(404).json({ error: "Association not found" }); return; }
    res.json(toDto(updated));
}

// POST /api/associations/:id/admins
// Body: { handle }
// Requires auth + must be an admin
export function addAdmin(req: AuthedRequest, res: Response): void {
    const actorId = req.personId;
    if (!actorId) { res.status(401).json({ error: "Authentication required" }); return; }

    const a = svc().getById(req.params.id as string);
    if (!a) { res.status(404).json({ error: "Association not found" }); return; }
    if (!a.isAdmin(actorId)) { res.status(403).json({ error: "Only admins can promote members" }); return; }

    const { handle } = req.body ?? {};
    if (typeof handle !== "string" || !handle) {
        res.status(400).json({ error: "handle is required" }); return;
    }
    const target = ppl().getByHandle(handle);
    if (!target) { res.status(404).json({ error: "Person not found" }); return; }

    const updated = svc().addAdmin(a.id, target.id);
    res.status(201).json(toDto(updated!));
}

// DELETE /api/associations/:id/admins/:handle
// Requires auth + must be an admin; cannot remove the last admin
export function removeAdmin(req: AuthedRequest, res: Response): void {
    const actorId = req.personId;
    if (!actorId) { res.status(401).json({ error: "Authentication required" }); return; }

    const a = svc().getById(req.params.id as string);
    if (!a) { res.status(404).json({ error: "Association not found" }); return; }
    if (!a.isAdmin(actorId)) { res.status(403).json({ error: "Only admins can change admin status" }); return; }

    const target = ppl().getByHandle(req.params.handle as string);
    if (!target) { res.status(404).json({ error: "Person not found" }); return; }
    if (a.adminIds.length === 1 && a.adminIds[0] === target.id) {
        res.status(400).json({ error: "Cannot remove the last admin" }); return;
    }

    const updated = svc().removeAdmin(a.id, target.id);
    if (!updated) { res.status(404).json({ error: "Association not found" }); return; }
    res.json(toDto(updated));
}
