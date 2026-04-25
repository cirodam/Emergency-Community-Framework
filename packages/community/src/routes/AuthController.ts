import { Request, Response } from "express";
import { PersonService } from "../person/PersonService.js";
import { Person } from "../person/Person.js";

const svc = () => PersonService.getInstance();

function toPersonDto(p: Person) {
    return {
        id:        p.id,
        firstName: p.firstName,
        lastName:  p.lastName,
        handle:    p.handle,
        phone:     p.phone,
        disabled:  p.disabled,
        retired:   p.retired,
        joinDate:  p.joinDate,
        hasPassword: p.hasPassword(),
    };
}

// POST /api/auth/login
// Body: { handle, password }
export async function login(req: Request, res: Response): Promise<void> {
    const { handle, password } = req.body ?? {};
    if (typeof handle !== "string" || typeof password !== "string") {
        res.status(400).json({ error: "handle and password are required" }); return;
    }
    const person = await svc().verifyPassword(handle, password);
    if (!person) { res.status(401).json({ error: "Invalid handle or password" }); return; }
    res.json(toPersonDto(person));
}

// POST /api/persons/:id/password
// Body: { password }
export async function setPassword(req: Request, res: Response): Promise<void> {
    const { password } = req.body ?? {};
    if (typeof password !== "string" || password.length < 8) {
        res.status(400).json({ error: "password must be at least 8 characters" }); return;
    }
    try {
        await svc().setPassword(req.params.id as string, password);
        res.status(204).send();
    } catch (err) {
        res.status(404).json({ error: (err as Error).message });
    }
}

// POST /api/auth/verify
// Body: PersonCredential JSON
export function verifyCredential(req: Request, res: Response): void {
    const credential = req.body;
    if (!credential || typeof credential !== "object") {
        res.status(400).json({ error: "credential body required" }); return;
    }
    const valid = svc().verifyCredential(credential);
    res.json({ valid });
}
