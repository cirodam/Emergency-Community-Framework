import { type Request, type Response, type NextFunction, type RequestHandler } from "express";
import { NodeSigner } from "./NodeSigner.js";

/**
 * Builds an Express middleware that verifies the Ed25519 signature on
 * inbound cross-node requests.
 *
 * Required headers:
 *   x-node-signature — hex Ed25519 signature over the raw UTF-8 request body
 *
 * @param getPublicKey
 *   Called with the request to resolve the expected public key (hex SPKI DER).
 *   Return undefined to accept the request without verification (e.g. when a
 *   sender has no public key yet). Return null to explicitly reject.
 */
export function verifyNodeSignature(
    getPublicKey: (req: Request) => string | null | undefined,
): RequestHandler {
    return (req: Request, res: Response, next: NextFunction): void => {
        const publicKey = getPublicKey(req);

        // undefined → skip verification and allow through
        if (publicKey === undefined) {
            next();
            return;
        }

        // null → caller explicitly says this sender is unknown/untrusted
        if (publicKey === null) {
            res.status(401).json({ error: "Unknown sender" });
            return;
        }

        const signature = req.headers["x-node-signature"];
        if (typeof signature !== "string") {
            res.status(401).json({ error: "Missing x-node-signature header" });
            return;
        }

        const rawBody = (req as Request & { rawBody?: string }).rawBody;
        if (rawBody === undefined) {
            res.status(500).json({ error: "Raw body unavailable" });
            return;
        }

        if (!NodeSigner.verify(rawBody, signature, publicKey)) {
            res.status(401).json({ error: "Invalid signature" });
            return;
        }

        next();
    };
}
