import { Request, Response } from "express";
import { OrgService } from "../organization/OrgService.js";
import { Organization } from "../organization/Organization.js";

const svc = () => OrgService.getInstance();

function toDto(org: Organization) {
    return {
        id:          org.id,
        handle:      org.handle,
        name:        org.name,
        description: org.description,
        foundedBy:   org.foundedBy,
        memberIds:   org.memberIds,
        createdAt:   org.createdAt,
        dissolvedAt: org.dissolvedAt,
        publicKeyHex: org.publicKeyHex,
    };
}

// GET /api/orgs
export function listOrgs(req: Request, res: Response): void {
    const includeDissoled = req.query["includeDisolved"] === "true";
    const orgs = includeDissoled ? svc().getAll() : svc().getActive();
    res.json(orgs.map(toDto));
}

// GET /api/orgs/:id
export function getOrg(req: Request, res: Response): void {
    const org = svc().get(req.params.id as string)
             ?? svc().getByHandle(req.params.id as string);
    if (!org) { res.status(404).json({ error: "Organization not found" }); return; }
    res.json(toDto(org));
}

// POST /api/orgs
// Body: { handle, name, foundedBy, description? }
export function createOrg(req: Request, res: Response): void {
    const { handle, name, foundedBy, description } = req.body ?? {};
    if (typeof handle !== "string" || !handle.trim()) {
        res.status(400).json({ error: "handle is required" }); return;
    }
    if (typeof name !== "string" || !name.trim()) {
        res.status(400).json({ error: "name is required" }); return;
    }
    if (typeof foundedBy !== "string" || !foundedBy.trim()) {
        res.status(400).json({ error: "foundedBy (personId) is required" }); return;
    }
    try {
        const org = svc().create(handle, name, foundedBy, description ?? null);
        res.status(201).json(toDto(org));
    } catch (err) {
        res.status(400).json({ error: (err as Error).message });
    }
}

// POST /api/orgs/:id/members
// Body: { personId }
export function addMember(req: Request, res: Response): void {
    const { personId } = req.body ?? {};
    if (typeof personId !== "string" || !personId.trim()) {
        res.status(400).json({ error: "personId is required" }); return;
    }
    try {
        const org = svc().addMember(req.params.id as string, personId);
        res.json(toDto(org));
    } catch (err) {
        res.status(404).json({ error: (err as Error).message });
    }
}

// DELETE /api/orgs/:id/members/:personId
export function removeMember(req: Request, res: Response): void {
    try {
        const org = svc().removeMember(req.params.id as string, req.params.personId as string);
        res.json(toDto(org));
    } catch (err) {
        res.status(404).json({ error: (err as Error).message });
    }
}

// DELETE /api/orgs/:id
export function dissolveOrg(req: Request, res: Response): void {
    try {
        const org = svc().dissolve(req.params.id as string);
        res.json(toDto(org));
    } catch (err) {
        res.status(400).json({ error: (err as Error).message });
    }
}
