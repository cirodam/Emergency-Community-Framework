import { Request, Response } from "express";
import { PersonService } from "../person/PersonService.js";
import { Person } from "../person/Person.js";
import { Constitution } from "../governance/Constitution.js";

const svc = () => PersonService.getInstance();

// GET /api/setup/status
// Returns { needsSetup: true } if no persons exist yet (fresh install).
export function getSetupStatus(req: Request, res: Response): void {
    res.json({ needsSetup: svc().count() === 0 });
}

// POST /api/setup
// Body: { communityName, firstName, lastName, birthDate, handle, password }
// Atomic first-boot setup: creates the founder person and sets their password.
// Returns 409 if setup has already been completed.
export async function setup(req: Request, res: Response): Promise<void> {
    if (svc().count() > 0) {
        res.status(409).json({ error: "Setup already completed" });
        return;
    }

    const { communityName, firstName, lastName, birthDate, handle, password } = req.body ?? {};

    if (typeof communityName !== "string" || !communityName.trim()) {
        res.status(400).json({ error: "communityName is required" }); return;
    }
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
    if (typeof handle !== "string" || !handle.trim()) {
        res.status(400).json({ error: "handle is required" }); return;
    }
    if (typeof password !== "string" || password.length < 8) {
        res.status(400).json({ error: "password must be at least 8 characters" }); return;
    }

    // Create the founder
    const person = new Person(
        firstName.trim(),
        lastName.trim(),
        parsedBirthDate,
        handle.trim().toLowerCase().replace(/[^a-z0-9_]/g, ""),
    );
    await svc().add(person);
    await svc().setPassword(person.id, password);

    // Grant the founder explicit stewardship
    svc().grantSteward(person.id);

    // Set the community name in the constitution and persist
    Constitution.getInstance().setCommunityName(communityName.trim());
    Constitution.getInstance().save();

    res.status(201).json({
        communityName: Constitution.getInstance().communityName,
        founder: {
            id:        person.id,
            firstName: person.firstName,
            lastName:  person.lastName,
            handle:    person.handle,
        },
    });
}
