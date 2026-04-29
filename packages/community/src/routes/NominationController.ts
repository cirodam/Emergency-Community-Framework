import { Request, Response } from "express";
import { NominationService } from "../nomination/NominationService.js";
import { Nomination } from "../nomination/Nomination.js";
import { PersonService } from "../person/PersonService.js";
import { DomainService } from "../DomainService.js";

type AuthedRequest = Request & { personId?: string };

const svc = () => NominationService.getInstance();

function toDto(n: Nomination) {
    return {
        id:         n.id,
        createdAt:  n.createdAt.toISOString(),
        createdBy:  n.createdBy,
        roleId:     n.roleId,
        unitId:     n.unitId,
        domainId:   n.domainId,
        nomineeId:  n.nomineeId,
        statement:  n.statement,
        status:     n.status,
        resolvedAt: n.resolvedAt?.toISOString() ?? null,
        resolvedBy: n.resolvedBy,
    };
}

// GET /api/nominations
export function listNominations(_req: Request, res: Response): void {
    res.json(svc().getAll().map(toDto));
}

// GET /api/nominations/vacancies
export function listVacancies(_req: Request, res: Response): void {
    res.json(svc().getVacancies());
}

// GET /api/nominations/expiring?days=60
export function listExpiring(req: Request, res: Response): void {
    const days = parseInt(req.query.days as string) || 60;
    res.json(svc().getExpiring(days));
}

// POST /api/nominations
// Body: { roleId, nomineeId, statement }
export function createNomination(req: AuthedRequest, res: Response): void {
    const personId = req.personId;
    if (!personId) { res.status(401).json({ error: "Authentication required" }); return; }

    const { roleId, nomineeId, statement } = req.body ?? {};

    if (typeof roleId !== "string" || !roleId.trim()) {
        res.status(400).json({ error: "roleId is required" }); return;
    }
    if (typeof nomineeId !== "string" || !nomineeId.trim()) {
        res.status(400).json({ error: "nomineeId is required" }); return;
    }

    // Verify the role exists
    const domainSvc = DomainService.getInstance();
    const role = domainSvc.getRole(roleId);
    if (!role) { res.status(404).json({ error: "Role not found" }); return; }

    // Verify the nominee is a real community member
    const nominee = PersonService.getInstance().get(nomineeId);
    if (!nominee) { res.status(404).json({ error: "Nominee not found" }); return; }

    // Find the unit and domain for this role
    const units = domainSvc.getUnits();
    const unit = units.find(u => u.roleIds.includes(roleId));
    if (!unit) { res.status(422).json({ error: "Role is not attached to a unit" }); return; }

    const domains = domainSvc.getDomains();
    const domain = domains.find(d => d.unitIds.includes(unit.id));
    if (!domain) { res.status(422).json({ error: "Unit is not attached to a domain" }); return; }

    const n = new Nomination(
        personId,
        roleId,
        unit.id,
        domain.id,
        nomineeId,
        typeof statement === "string" ? statement.trim() : "",
    );
    svc().create(n);
    res.status(201).json(toDto(n));
}

// PATCH /api/nominations/:id/confirm
export function confirmNomination(req: AuthedRequest, res: Response): void {
    const personId = req.personId;
    if (!personId) { res.status(401).json({ error: "Authentication required" }); return; }

    const n = svc().confirm(req.params.id as string, personId);
    if (!n) { res.status(404).json({ error: "Nomination not found or already resolved" }); return; }

    // If confirmed, assign nominee to the role
    const domainSvc = DomainService.getInstance();
    const role = domainSvc.getRole(n.roleId);
    if (role) {
        role.memberId = n.nomineeId;
        domainSvc.saveRole(role);
    }

    res.json(toDto(n));
}

// PATCH /api/nominations/:id/decline
export function declineNomination(req: AuthedRequest, res: Response): void {
    const personId = req.personId;
    if (!personId) { res.status(401).json({ error: "Authentication required" }); return; }

    const n = svc().decline(req.params.id as string, personId);
    if (!n) { res.status(404).json({ error: "Nomination not found or already resolved" }); return; }
    res.json(toDto(n));
}
