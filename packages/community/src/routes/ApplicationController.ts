import { Request, Response } from "express";
import { PersonCredential } from "@ecf/core";
import { MemberApplicationService } from "../applications/MemberApplicationService.js";
import { MemberApplication } from "../applications/MemberApplication.js";
import { PersonService } from "../person/PersonService.js";

type AuthedRequest = Request & { personId?: string; credential?: PersonCredential };

const svc    = () => MemberApplicationService.getInstance();
const people = () => PersonService.getInstance();

function toDto(app: MemberApplication | undefined | null) {
    if (!app) return null;
    const vouchers = app.voucherIds.map(id => {
        const p = people().get(id);
        return { id, name: p ? `${p.firstName} ${p.lastName}` : id };
    });
    const submitter = people().get(app.submittedBy);
    return {
        id:              app.id,
        firstName:       app.firstName,
        lastName:        app.lastName,
        birthDate:       app.birthDate,
        message:         app.message,
        status:          app.status,
        voucherIds:      app.voucherIds,
        vouchers,
        vouchesRequired: svc().vouchesRequired(),
        submittedBy:     app.submittedBy,
        submittedByName: submitter ? `${submitter.firstName} ${submitter.lastName}` : (app.submittedBy === "self" ? "Self-submitted" : app.submittedBy),
        submittedAt:     app.submittedAt,
        admittedAt:      app.admittedAt,
    };
}

// GET /api/applications
export function listApplications(_req: Request, res: Response): void {
    res.json(svc().getAll().map(a => toDto(a)));
}

// GET /api/applications/:id
export function getApplication(req: Request, res: Response): void {
    const app = svc().get(req.params.id as string);
    if (!app) { res.status(404).json({ error: "Application not found" }); return; }
    res.json(toDto(app));
}

// POST /api/applications
// Body: { firstName, lastName, birthDate, message }
// Submitter is taken from the authenticated Bearer credential.
export function submitApplication(req: AuthedRequest, res: Response): void {
    const submittedBy = req.personId;
    const { firstName, lastName, birthDate, message } = req.body ?? {};

    if (!submittedBy || !people().get(submittedBy)) {
        res.status(401).json({ error: "Authenticated member not found" }); return;
    }
    if (typeof firstName !== "string" || !firstName.trim()) {
        res.status(400).json({ error: "firstName is required" }); return;
    }
    if (typeof lastName !== "string" || !lastName.trim()) {
        res.status(400).json({ error: "lastName is required" }); return;
    }
    if (!birthDate || isNaN(new Date(birthDate).getTime())) {
        res.status(400).json({ error: "birthDate must be a valid date" }); return;
    }
    if (typeof message !== "string") {
        res.status(400).json({ error: "message is required" }); return;
    }

    const app = svc().submit(
        firstName.trim(),
        lastName.trim(),
        birthDate,
        message.trim(),
        submittedBy,
    );
    res.status(201).json(toDto(app));
}

// POST /api/apply  (public — no auth required)
// The applicant submits their own application. submittedBy is recorded as "self".
export function publicSubmitApplication(req: Request, res: Response): void {
    const { firstName, lastName, birthDate, message } = req.body ?? {};

    if (typeof firstName !== "string" || !firstName.trim()) {
        res.status(400).json({ error: "firstName is required" }); return;
    }
    if (typeof lastName !== "string" || !lastName.trim()) {
        res.status(400).json({ error: "lastName is required" }); return;
    }
    if (!birthDate || isNaN(new Date(birthDate).getTime())) {
        res.status(400).json({ error: "birthDate must be a valid date" }); return;
    }
    if (typeof message !== "string" || !message.trim()) {
        res.status(400).json({ error: "message is required" }); return;
    }

    const app = svc().submit(
        firstName.trim(),
        lastName.trim(),
        birthDate,
        message.trim(),
        "self",
    );
    res.status(201).json(toDto(app));
}

// POST /api/applications/:id/vouch
// Voucher is taken from the authenticated Bearer credential.
export async function vouchForApplication(req: AuthedRequest, res: Response): Promise<void> {
    const voucherId = req.personId;
    if (!voucherId || !people().get(voucherId)) {
        res.status(401).json({ error: "Authenticated member not found" }); return;
    }
    try {
        const app = await svc().vouch(req.params.id as string, voucherId);
        res.json(toDto(app));
    } catch (err) {
        res.status(400).json({ error: (err as Error).message });
    }
}

// DELETE /api/applications/:id/vouch
// Removes the authenticated member's vouch.
export function removeVouch(req: AuthedRequest, res: Response): void {
    const voucherId = req.personId;
    if (!voucherId) {
        res.status(401).json({ error: "Authenticated member not found" }); return;
    }
    try {
        const app = svc().unvouch(req.params.id as string, voucherId);
        res.json(toDto(app));
    } catch (err) {
        res.status(400).json({ error: (err as Error).message });
    }
}

// POST /api/applications/:id/withdraw
export function withdrawApplication(req: AuthedRequest, res: Response): void {
    const app = svc().get(req.params.id as string);
    if (!app) { res.status(404).json({ error: "Application not found" }); return; }
    if (app.submittedBy !== "self" && app.submittedBy !== req.personId) {
        res.status(403).json({ error: "You may only withdraw your own application" }); return;
    }
    try {
        res.json(toDto(svc().withdraw(app.id)));
    } catch (err) {
        res.status(400).json({ error: (err as Error).message });
    }
}
