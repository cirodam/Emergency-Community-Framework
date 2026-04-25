import { Request, Response } from "express";
import { PersonService } from "../person/PersonService.js";

const svc = () => PersonService.getInstance();

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

// POST /api/persons/:id/pin
// Body: { pin }
export function setPin(req: Request, res: Response): void {
    const { pin } = req.body ?? {};
    if (typeof pin !== "string" || pin.length < 4) {
        res.status(400).json({ error: "pin must be at least 4 characters" }); return;
    }
    try {
        svc().setPin(req.params.id as string, pin);
        res.status(204).send();
    } catch (err) {
        res.status(404).json({ error: (err as Error).message });
    }
}

// POST /api/auth/pin
// Body: { personId, pin }
export function verifyPin(req: Request, res: Response): void {
    const { personId, pin } = req.body ?? {};
    if (typeof personId !== "string" || typeof pin !== "string") {
        res.status(400).json({ error: "personId and pin are required" }); return;
    }
    const valid = svc().verifyPin(personId, pin);
    res.json({ valid });
}
