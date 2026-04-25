import { Request, Response } from "express";
import { AccountOwner, OwnerType } from "../AccountOwner.js";
import { AccountOwnerService } from "../AccountOwnerService.js";

const OWNER_TYPES: OwnerType[] = ["person", "institution"];
const svc = () => AccountOwnerService.getInstance();

/** Public DTO — never exposes hash fields */
function toOwnerDto(o: AccountOwner) {
    return {
        ownerId:      o.ownerId,
        ownerType:    o.ownerType,
        displayName:  o.displayName,
        createdAt:    o.createdAt.toISOString(),
        phone:        o.phone,
        hasPassword:  !!o.passwordHash,
        hasPin:       !!o.pinHash,
        publicKeyHex: o.publicKeyHex,
    };
}

// POST /api/owners
// Body: { ownerType, displayName, phone?, publicKeyHex?, ownerId? }
export function createOwner(req: Request, res: Response): void {
    const { ownerType, displayName, phone, publicKeyHex, ownerId } = req.body ?? {};
    if (!OWNER_TYPES.includes(ownerType)) {
        res.status(400).json({ error: `ownerType must be one of: ${OWNER_TYPES.join(", ")}` }); return;
    }
    if (typeof displayName !== "string" || !displayName.trim()) {
        res.status(400).json({ error: "displayName is required" }); return;
    }
    try {
        const owner = svc().create(ownerType as OwnerType, displayName.trim(), {
            phone:        phone        ?? undefined,
            publicKeyHex: publicKeyHex ?? undefined,
            ownerId:      ownerId      ?? undefined,
        });
        res.status(201).json(toOwnerDto(owner));
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        res.status(409).json({ error: msg });
    }
}

// GET /api/owners
export function getAllOwners(_req: Request, res: Response): void {
    res.json(svc().getAll().map(toOwnerDto));
}

// GET /api/owners/:ownerId
export function getOwner(req: Request, res: Response): void {
    const owner = svc().get(req.params.ownerId as string);
    if (!owner) { res.status(404).json({ error: "Owner not found" }); return; }
    res.json(toOwnerDto(owner));
}

// POST /api/owners/:ownerId/password
// Body: { password }
export async function setPassword(req: Request, res: Response): Promise<void> {
    const { password } = req.body ?? {};
    if (typeof password !== "string") {
        res.status(400).json({ error: "password is required" }); return;
    }
    try {
        await svc().setPassword(req.params.ownerId as string, password);
        res.status(204).send();
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        res.status(400).json({ error: msg });
    }
}

// POST /api/owners/:ownerId/pin
// Body: { pin }
export async function setPin(req: Request, res: Response): Promise<void> {
    const { pin } = req.body ?? {};
    if (typeof pin !== "string") {
        res.status(400).json({ error: "pin is required" }); return;
    }
    try {
        await svc().setPin(req.params.ownerId as string, pin);
        res.status(204).send();
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        res.status(400).json({ error: msg });
    }
}

// POST /api/auth/password
// Body: { ownerId?, phone?, password }
// Looks up by ownerId or phone, verifies password, returns owner DTO.
export async function verifyPassword(req: Request, res: Response): Promise<void> {
    const { ownerId, phone, password } = req.body ?? {};
    if (typeof password !== "string") {
        res.status(400).json({ error: "password is required" }); return;
    }
    let resolvedId: string | undefined = ownerId;
    if (!resolvedId && phone) {
        resolvedId = svc().getByPhone(phone)?.ownerId;
    }
    if (!resolvedId) {
        // Return 401, not 404, so callers can't enumerate owners
        res.status(401).json({ error: "Invalid credentials" }); return;
    }
    const ok = await svc().verifyPassword(resolvedId, password);
    if (!ok) { res.status(401).json({ error: "Invalid credentials" }); return; }
    const owner = svc().get(resolvedId)!;
    res.json(toOwnerDto(owner));
}

// POST /api/auth/pin
// Body: { phone, pin }
export async function verifyPin(req: Request, res: Response): Promise<void> {
    const { phone, pin } = req.body ?? {};
    if (typeof phone !== "string" || typeof pin !== "string") {
        res.status(400).json({ error: "phone and pin are required" }); return;
    }
    const owner = await svc().verifyPin(phone, pin);
    if (!owner) { res.status(401).json({ error: "Invalid credentials" }); return; }
    res.json(toOwnerDto(owner));
}
