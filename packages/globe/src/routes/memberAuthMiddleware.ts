import { type Request, type Response, type NextFunction, type RequestHandler } from "express";
import { verifyNodeSignature } from "@ecf/core";
import { GlobeMemberService } from "../GlobeMemberService.js";

/**
 * Middleware that authenticates a request from a registered member commonwealth.
 *
 * Expects:
 *   x-node-id        — the commonwealth's stable node ID
 *   x-node-signature — Ed25519 hex signature over the raw UTF-8 request body
 */
export function requireMemberCommonwealth(): RequestHandler {
    return (req: Request, res: Response, next: NextFunction): void => {
        const nodeId = req.headers["x-node-id"];
        if (typeof nodeId !== "string") {
            res.status(401).json({ error: "Missing x-node-id header" });
            return;
        }

        const member = GlobeMemberService.getInstance().getByNodeId(nodeId);
        if (!member) {
            res.status(401).json({ error: "Unknown commonwealth" });
            return;
        }

        verifyNodeSignature(() => member.commonwealthPublicKey)(req, res, () => {
            (req as Request & { memberId: string; commonwealthNodeId: string }).memberId = member.id;
            (req as Request & { memberId: string; commonwealthNodeId: string }).commonwealthNodeId = member.commonwealthNodeId;
            next();
        });
    };
}
