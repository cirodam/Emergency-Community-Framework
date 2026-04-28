import { Router } from "express";
import { getIdentity, getPeers, ping, announce, receiveMessage } from "./NetworkController.js";
import { verifyNodeSignature } from "./signatureMiddleware.js";
import { NodeService } from "./NodeService.js";

const router = Router();

// Read-only gossip endpoints — unauthenticated
router.get("/identity", getIdentity);
router.get("/peers",    getPeers);

// POST /node/ping — signed by a known peer (publicKey looked up from registry)
router.post("/ping",
    verifyNodeSignature(req => {
        const peer = NodeService.getInstance().getRegistry().get(req.body?.fromId);
        // peer not in registry → undefined → skip verification (allow through)
        return peer?.publicKey;
    }),
    ping,
);

// POST /node/announce — verify using publicKey from the body itself
router.post("/announce",
    verifyNodeSignature(req => req.body?.publicKey),
    announce,
);

export default router;

// ── Message endpoint (mounted separately at /api/message) ────────────────────
import { Router as _Router } from "express";
export const messageRouter = _Router();

// POST /api/message — signed by sender's node key
// Sender's public key is fetched lazily from their /api/node/identity endpoint.
messageRouter.post("/",
    verifyNodeSignature(req => {
        // Try local peer registry first
        const peer = NodeService.getInstance().getRegistry().get(req.body?.from);
        if (peer?.publicKey) return peer.publicKey;
        // Unknown sender — skip verification for now (allows bootstrap)
        // Phase 2: fetch and cache public key from req.body.from
        return undefined;
    }),
    receiveMessage,
);
