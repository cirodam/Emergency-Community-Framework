import { type Request, type Response, type NextFunction, type RequestHandler } from "express";
import { verifyNodeSignature } from "@ecf/core";
import { CommonwealthMemberService } from "../CommonwealthMemberService.js";

/**
 * Middleware that authenticates a request from a registered member federation.
 *
 * Expects:
 *   x-node-id        — the federation's stable node ID
 *   x-node-signature — Ed25519 hex signature over the raw UTF-8 request body
 */
export function requireMemberFederation(): RequestHandler {
    return (req: Request, res: Response, next: NextFunction): void => {
        const nodeId = req.headers["x-node-id"];
        if (typeof nodeId !== "string") {
            res.status(401).json({ error: "Missing x-node-id header" });
            return;
        }

        const member = CommonwealthMemberService.getInstance().getByNodeId(nodeId);
        if (!member) {
            res.status(401).json({ error: "Unknown federation" });
            return;
        }

        verifyNodeSignature(() => member.federationPublicKey)(req, res, () => {
            (req as Request & { memberId: string; federationNodeId: string }).memberId = member.id;
            (req as Request & { memberId: string; federationNodeId: string }).federationNodeId = member.federationNodeId;
            next();
        });
    };
}
