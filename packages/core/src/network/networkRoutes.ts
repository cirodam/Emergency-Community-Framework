import { Router } from "express";
import { getIdentity, getPeers, ping, announce } from "./NetworkController.js";
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
