import { Request, Response } from "express";
import { DomainService } from "../DomainService.js";
import { FunctionalDomain } from "../common/domain/FunctionalDomain.js";
import { FunctionalUnit } from "../common/domain/FunctionalUnit.js";
import { UnitTemplateRegistry } from "../common/domain/UnitTemplateRegistry.js";
import { CommunityRole } from "../common/CommunityRole.js";
import { LeaderPool } from "../governance/LeaderPool.js";

const svc = () => DomainService.getInstance();

// ── Domains ───────────────────────────────────────────────────────────────────

// GET /api/domains
export function listDomains(_req: Request, res: Response): void {
    res.json(svc().getDomains().map(toDomainDto));
}

// GET /api/domains/:id
export function getDomain(req: Request, res: Response): void {
    const domain = svc().getDomain(req.params.id as string);
    if (!domain) { res.status(404).json({ error: "Domain not found" }); return; }
    res.json(toDomainDto(domain));
}

// PATCH /api/domains/:id
// Body: { poolId? }
export function updateDomain(req: Request, res: Response): void {
    const domain = svc().getDomain(req.params.id as string);
    if (!domain) { res.status(404).json({ error: "Domain not found" }); return; }
    const { poolId } = req.body ?? {};
    if (poolId !== undefined) {
        if (poolId !== null && typeof poolId !== "string") {
            res.status(400).json({ error: "poolId must be a string or null" }); return;
        }
        domain.poolId = poolId;
        // Persist via DomainService (re-save domain state)
        svc().registerDomain(domain); // no-op if already registered, updates map
    }
    res.json(toDomainDto(domain));
}

// ── Units ─────────────────────────────────────────────────────────────────────

// GET /api/units
export function listUnits(_req: Request, res: Response): void {
    res.json(svc().getUnits().map(toUnitDto));
}

// GET /api/units/:id
export function getUnit(req: Request, res: Response): void {
    const unit = svc().getUnit(req.params.id as string);
    if (!unit) { res.status(404).json({ error: "Unit not found" }); return; }
    res.json(toUnitDto(unit));
}

// POST /api/units
// Body: { type, domainId, name?, description? }
// Creates a unit from a registered template and attaches it to the domain.
// Optional name/description override the template defaults.
export function createUnit(req: Request, res: Response): void {
    const { type, domainId, name, description } = req.body ?? {};
    if (typeof type !== "string" || !type.trim()) {
        res.status(400).json({ error: "type is required" }); return;
    }
    if (typeof domainId !== "string" || !domainId) {
        res.status(400).json({ error: "domainId is required" }); return;
    }
    const domain = svc().getDomain(domainId);
    if (!domain) { res.status(404).json({ error: "Domain not found" }); return; }

    const unit = UnitTemplateRegistry.create(type.trim());
    if (!unit) { res.status(400).json({ error: `Unknown unit type "${type}"` }); return; }

    if (typeof name === "string" && name.trim()) {
        (unit as unknown as Record<string, unknown>)["name"] = name.trim();
    }
    if (typeof description === "string") {
        (unit as unknown as Record<string, unknown>)["description"] = description;
    }

    svc().createUnit(unit, domainId);
    res.status(201).json(toUnitDto(unit));
}

// DELETE /api/units/:id
export function deleteUnit(req: Request, res: Response): void {
    const deleted = svc().deleteUnit(req.params.id as string);
    if (!deleted) { res.status(404).json({ error: "Unit not found" }); return; }
    res.status(204).send();
}

// GET /api/templates
// Returns all registered unit templates (type, label, description).
export function listTemplates(_req: Request, res: Response): void {
    const templates = UnitTemplateRegistry.getAll().map(t => ({
        type:        t.type,
        label:       t.label,
        description: t.description,
    }));
    res.json(templates);
}

// ── Roles ─────────────────────────────────────────────────────────────────────

// GET /api/roles
export function listRoles(_req: Request, res: Response): void {
    res.json(svc().getRoles().map(toRoleDto));
}

// GET /api/roles/:id
export function getRole(req: Request, res: Response): void {
    const role = svc().getRole(req.params.id as string);
    if (!role) { res.status(404).json({ error: "Role not found" }); return; }
    res.json(toRoleDto(role));
}

// POST /api/roles
// Body: { title, description?, kinPerMonth?, parentId, parentType: "domain"|"unit" }
export function createRole(req: Request, res: Response): void {
    const { title, description, kinPerMonth, parentId, parentType } = req.body ?? {};
    if (typeof title !== "string" || !title.trim()) {
        res.status(400).json({ error: "title is required" }); return;
    }
    if (typeof parentId !== "string" || !parentId) {
        res.status(400).json({ error: "parentId is required" }); return;
    }
    if (parentType !== "domain" && parentType !== "unit") {
        res.status(400).json({ error: "parentType must be 'domain' or 'unit'" }); return;
    }
    const role = new CommunityRole(title.trim(), description ?? "", kinPerMonth ?? 0);
    svc().createRole(role, parentId, parentType);
    res.status(201).json(toRoleDto(role));
}

// PATCH /api/roles/:id
// Body: { memberId?, kinPerMonth?, funded?, termStartDate?, termEndDate?, title?, description? }
export function updateRole(req: Request, res: Response): void {
    const role = svc().getRole(req.params.id as string);
    if (!role) { res.status(404).json({ error: "Role not found" }); return; }
    const { memberId, kinPerMonth, funded, termStartDate, termEndDate, title, description } = req.body ?? {};
    if (title        !== undefined) role.title        = title;
    if (description  !== undefined) role.description  = description;
    if (memberId     !== undefined) role.memberId     = memberId;
    if (kinPerMonth  !== undefined) role.kinPerMonth  = kinPerMonth;
    if (funded       !== undefined) role.funded       = funded;
    if (termStartDate !== undefined) role.termStartDate = termStartDate ? new Date(termStartDate) : null;
    if (termEndDate   !== undefined) role.termEndDate   = termEndDate   ? new Date(termEndDate)   : null;
    svc().saveRole(role);
    res.json(toRoleDto(role));
}

// DELETE /api/roles/:id
export function deleteRole(req: Request, res: Response): void {
    const deleted = svc().deleteRole(req.params.id as string);
    if (!deleted) { res.status(404).json({ error: "Role not found" }); return; }
    res.status(204).send();
}

// ── Pools ─────────────────────────────────────────────────────────────────────

// GET /api/pools
export function listPools(_req: Request, res: Response): void {
    res.json(svc().getPools().map(toPoolDto));
}

// GET /api/pools/:id
export function getPool(req: Request, res: Response): void {
    const pool = svc().getPool(req.params.id as string);
    if (!pool) { res.status(404).json({ error: "Pool not found" }); return; }
    res.json(toPoolDto(pool));
}

// POST /api/pools
// Body: { name, description? }
export function createPool(req: Request, res: Response): void {
    const { name, description } = req.body ?? {};
    if (typeof name !== "string" || !name.trim()) {
        res.status(400).json({ error: "name is required" }); return;
    }
    const pool = new LeaderPool(name.trim(), description ?? "");
    svc().createPool(pool);
    res.status(201).json(toPoolDto(pool));
}

// POST /api/pools/:id/members
// Body: { personId }
export function addPoolMember(req: Request, res: Response): void {
    const pool = svc().getPool(req.params.id as string);
    if (!pool) { res.status(404).json({ error: "Pool not found" }); return; }
    const { personId } = req.body ?? {};
    if (typeof personId !== "string" || !personId) {
        res.status(400).json({ error: "personId is required" }); return;
    }
    pool.addPerson(personId);
    svc().savePool(pool);
    res.json(toPoolDto(pool));
}

// DELETE /api/pools/:id/members/:personId
export function removePoolMember(req: Request, res: Response): void {
    const pool = svc().getPool(req.params.id as string);
    if (!pool) { res.status(404).json({ error: "Pool not found" }); return; }
    pool.removePerson(req.params.personId as string);
    svc().savePool(pool);
    res.json(toPoolDto(pool));
}

// DELETE /api/pools/:id
export function deletePool(req: Request, res: Response): void {
    const deleted = svc().deletePool(req.params.id as string);
    if (!deleted) { res.status(404).json({ error: "Pool not found" }); return; }
    res.status(204).send();
}

// ── DTOs ──────────────────────────────────────────────────────────────────────

function toDomainDto(d: FunctionalDomain) {
    return {
        id:          d.getId(),
        name:        d.getDisplayName(),
        handle:      d.getHandle(),
        description: d.description,
        unitIds:     d.unitIds,
        roleIds:     d.roleIds,
        poolId:      d.poolId,
    };
}

function toUnitDto(u: FunctionalUnit) {
    return {
        id:          u.id,
        name:        u.name,
        description: u.description,
        type:        u.getType(),
        personIds:   u.personIds,
        roleIds:     u.roleIds,
        createdAt:   u.createdAt,
    };
}

function toRoleDto(r: CommunityRole) {
    return {
        id:            r.id,
        title:         r.title,
        description:   r.description,
        memberId:      r.memberId,
        kinPerMonth:   r.kinPerMonth,
        funded:        r.funded,
        termStartDate: r.termStartDate,
        termEndDate:   r.termEndDate,
        isActive:      r.isActive(),
    };
}

function toPoolDto(p: LeaderPool) {
    return {
        id:          p.id,
        name:        p.name,
        description: p.description,
        personIds:   p.personIds,
        createdAt:   p.createdAt,
    };
}
