import { Request, Response } from "express";
import { PersonService } from "../person/PersonService.js";
import { Person } from "../person/Person.js";

const svc = () => PersonService.getInstance();

// GET /api/persons
export function listPersons(req: Request, res: Response): void {
    res.json(svc().getAll().map(toDto));
}

// GET /api/persons/:id
export function getPerson(req: Request, res: Response): void {
    const person = svc().get(req.params.id as string);
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
    const person = new Person(firstName.trim(), lastName.trim(), parsedBirthDate);
    if (phone)     person.phone     = phone;
    if (languages) person.languages = languages;
    await svc().add(person);
    res.status(201).json(toDto(person));
}

// PATCH /api/persons/:id
export function updatePerson(req: Request, res: Response): void {
    try {
        const person = svc().update(req.params.id as string, req.body ?? {});
        res.json(toDto(person));
    } catch (err) {
        res.status(404).json({ error: (err as Error).message });
    }
}

// DELETE /api/persons/:id
export async function dischargePerson(req: Request, res: Response): Promise<void> {
    const person = svc().get(req.params.id as string);
    if (!person) { res.status(404).json({ error: "Person not found" }); return; }
    await svc().discharge(person);
    res.status(204).send();
}

// POST /api/persons/:id/credential
export function issueCredential(req: Request, res: Response): void {
    const person = svc().get(req.params.id as string);
    if (!person) { res.status(404).json({ error: "Person not found" }); return; }
    const credential = svc().issueCredential(person);
    res.json(credential);
}

function toDto(p: Person) {
    return {
        id:         p.id,
        firstName:  p.firstName,
        lastName:   p.lastName,
        handle:     p.handle,
        phone:      p.phone,
        disabled:   p.disabled,
        retired:    p.retired,
        languages:  p.languages,
        joinDate:   p.joinDate,
        credential: p.credential,
    };
}
