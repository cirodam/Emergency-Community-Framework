import { Request, Response } from "express";
import { NodeService } from "./NodeService.js";
import { NodeIdentity } from "./NodeIdentity.js";

const node = () => NodeService.getInstance();

// GET /node/identity
export function getIdentity(_req: Request, res: Response): void {
    res.json(node().getIdentity());
}

// GET /node/peers
// Returns a random sample of healthy known peers for gossip.
export function getPeers(req: Request, res: Response): void {
    const excludeId = typeof req.query.excludeId === "string"
        ? req.query.excludeId
        : undefined;
    res.json(node().getPeerSample(excludeId));
}

// POST /node/ping
// Body: { fromId: string, fromAddress: string }
// Returns: { nodeId, name, timestamp }
export function ping(req: Request, res: Response): void {
    const { fromId, fromAddress } = req.body ?? {};
    if (typeof fromId !== "string" || typeof fromAddress !== "string") {
        res.status(400).json({ error: "fromId and fromAddress are required" });
        return;
    }

    const identity = node().getIdentity();
    res.json({
        nodeId:    identity.id,
        name:      identity.name,
        timestamp: new Date(),
    });
}

// POST /node/announce
// Body: NodeIdentity — a peer introducing itself
export function announce(req: Request, res: Response): void {
    const body = req.body as Partial<NodeIdentity>;

    if (typeof body.id !== "string"        ||
        typeof body.type !== "string"      ||
        typeof body.name !== "string"      ||
        typeof body.address !== "string"   ||
        typeof body.publicKey !== "string") {
        res.status(400).json({ error: "id, type, name, address, and publicKey are required" });
        return;
    }

    const identity: NodeIdentity = {
        id:        body.id,
        entityId:  typeof body.entityId === "string" ? body.entityId : body.id,
        type:      body.type,
        name:      body.name,
        address:   body.address,
        publicKey: body.publicKey,
        createdAt: body.createdAt ? new Date(body.createdAt as unknown as string) : new Date(),
    };

    node().handleAnnounce(identity);
    res.status(204).end();
}
