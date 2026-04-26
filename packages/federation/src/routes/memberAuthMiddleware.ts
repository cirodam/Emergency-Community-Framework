import { type Request, type Response, type NextFunction, type RequestHandler } from "express";
import { verifyNodeSignature } from "@ecf/core";
import { FederationMemberService } from "../FederationMemberService.js";

/**
 * Middleware that authenticates a request from a registered member community.
 *
 * Expects:
 *   x-node-id        — the community's stable node ID (registered at join time)
 *   x-node-signature — Ed25519 hex signature over the raw UTF-8 request body
 *
 * On success, attaches req.communityId and req.communityNodeId for downstream use.
 */
export function requireMemberCommunity(): RequestHandler {
    return (req: Request, res: Response, next: NextFunction): void => {
        const nodeId = req.headers["x-node-id"];
        if (typeof nodeId !== "string") {
            res.status(401).json({ error: "Missing x-node-id header" });
            return;
        }

        const member = FederationMemberService.getInstance().getByNodeId(nodeId);
        if (!member) {
            res.status(401).json({ error: "Unknown community" });
            return;
        }

        // Delegate signature verification to core middleware, supplying the
        // registered public key for this community.
        verifyNodeSignature(() => member.communityPublicKey)(req, res, () => {
            (req as Request & { communityId: string; communityNodeId: string }).communityId = member.id;
            (req as Request & { communityId: string; communityNodeId: string }).communityNodeId = member.communityNodeId;
            next();
        });
    };
}
