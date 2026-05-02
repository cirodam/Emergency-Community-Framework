import { Request, Response } from "express";
import { PersonService } from "../person/PersonService.js";
import { DomainService } from "../DomainService.js";
import { Person } from "../person/Person.js";
import { HandleRegistry } from "../HandleRegistry.js";

const svc = () => PersonService.getInstance();

// GET /api/persons
export function listPersons(req: Request, res: Response): void {
    res.json(svc().getAll().map(toListDto));
}

// GET /api/persons/:handle
export function getPerson(req: Request, res: Response): void {
    const person = svc().getByHandle(req.params.handle as string);
    if (!person) { res.status(404).json({ error: "Person not found" }); return; }
    res.json(toDto(person));
}

// POST /api/persons
// Body: { firstName, lastName, birthDate, phone?, languages? }
export async function addPerson(req: Request, res: Response): Promise<void> {
    const { firstName, lastName, birthDate, phone, languages } = req.body ?? {};
    if (typeof firstName !== "string" || !firstName.trim()) {
        res.status(400).json({ error: "firstName is required" }); return;
    }
    if (typeof lastName !== "string" || !lastName.trim()) {
        res.status(400).json({ error: "lastName is required" }); return;
    }
    if (!birthDate) {
        res.status(400).json({ error: "birthDate is required" }); return;
    }
    const parsedBirthDate = new Date(birthDate);
    if (isNaN(parsedBirthDate.getTime())) {
        res.status(400).json({ error: "birthDate must be a valid date" }); return;
    }

    // Derive a unique handle from firstName_lastName
    const base = `${firstName.trim()}_${lastName.trim()}`.toLowerCase().replace(/[^a-z0-9_]/g, "");
    let handle = base;
    let suffix = 2;
    while (HandleRegistry.getInstance().isTaken(handle)) {
        if (suffix > 999) {
            res.status(409).json({ error: "Could not generate a unique handle" });
            return;
        }
        handle = `${base}_${suffix++}`;
    }

    const person = new Person(
        firstName.trim(),
        lastName.trim(),
        parsedBirthDate,
        handle,
        false,
        null,
        null,
        [],
    );
    if (phone)     person.phone     = phone;
    if (languages) person.languages = languages;
    await svc().add(person);
    res.status(201).json(toDto(person));
}

// PATCH /api/persons/:handle
export function updatePerson(req: Request, res: Response): void {
    try {
        const person = svc().getByHandle(req.params.handle as string);
        if (!person) { res.status(404).json({ error: "Person not found" }); return; }
        const updated = svc().update(person.id, req.body ?? {});
        res.json(toDto(updated));
    } catch (err) {
        const msg = (err as Error).message ?? "";
        const status = msg.toLowerCase().includes("not found") ? 404 : 400;
        res.status(status).json({ error: msg });
    }
}

// DELETE /api/persons/:handle
export async function dischargePerson(req: Request, res: Response): Promise<void> {
    const person = svc().getByHandle(req.params.handle as string);
    if (!person) { res.status(404).json({ error: "Person not found" }); return; }
    await svc().discharge(person);
    res.status(204).send();
}

// POST /api/persons/:handle/credential
export function issueCredential(req: Request, res: Response): void {
    const person = svc().getByHandle(req.params.handle as string);
    if (!person) { res.status(404).json({ error: "Person not found" }); return; }
    const credential = svc().issueCredential(person);
    res.json(credential);
}

// POST /api/persons/:handle/steward
export function grantSteward(req: Request, res: Response): void {
    try {
        const person = svc().getByHandle(req.params.handle as string);
        if (!person) { res.status(404).json({ error: "Person not found" }); return; }
        const updated = svc().grantSteward(person.id);
        res.json(toDto(updated));
    } catch (err) {
        res.status(404).json({ error: (err as Error).message });
    }
}

// DELETE /api/persons/:handle/steward
export function revokeSteward(req: Request, res: Response): void {
    try {
        const person = svc().getByHandle(req.params.handle as string);
        if (!person) { res.status(404).json({ error: "Person not found" }); return; }
        const updated = svc().revokeSteward(person.id);
        res.json(toDto(updated));
    } catch (err) {
        res.status(404).json({ error: (err as Error).message });
    }
}

/** Full DTO — includes phone and appPermissions; only used for the individual GET. */
function toDto(p: Person) {
    return {
        firstName:       p.firstName,
        lastName:        p.lastName,
        handle:          p.handle,
        phone:           p.phone,
        disabled:        p.disabled,
        retired:         p.retired,
        steward:         p.steward,
        isSteward:       svc().isSteward(p),
        languages:       p.languages,
        joinDate:        p.joinDate,
        credential:      p.credential,
        appPermissions:  svc().resolveAppPermissionsWithSuspensions(p, DomainService.getInstance()),
    };
}

/** Stripped DTO for list responses — omits phone. */
function toListDto(p: Person) {
    return {
        firstName:       p.firstName,
        lastName:        p.lastName,
        handle:          p.handle,
        disabled:        p.disabled,
        retired:         p.retired,
        steward:         p.steward,
        isSteward:       svc().isSteward(p),
        languages:       p.languages,
        joinDate:        p.joinDate,
    };
}
