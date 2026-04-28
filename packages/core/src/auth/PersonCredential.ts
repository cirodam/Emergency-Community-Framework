import { type Request, type Response, type NextFunction, type RequestHandler } from "express";
import { NodeSigner } from "../network/NodeSigner.js";

/**
 * A community-issued credential that proves a person is an active member.
 *
 * Issued by the community node at login time. Other containers (bank,
 * marketplace, etc.) verify it locally using the cached community public key —
 * no round-trip to community required.
 *
 * The signature covers a deterministic JSON payload of the six non-signature
 * fields. Changing any field invalidates the signature.
 */
export interface PersonCredential {
    personId: string;
    handle: string;             // community handle, cryptographically bound
    personPublicKey: string;    // hex SPKI DER — person's own Ed25519 key
    communityNodeId: string;
    communityPublicKey: string; // hex SPKI DER — used by verifiers
    issuedAt: string;           // ISO 8601
    expiresAt: string;          // ISO 8601
    signature: string;          // hex Ed25519, signed by the community node
}

/** Reconstruct the deterministic payload that was signed at issuance. */
function credentialPayload(c: PersonCredential): string {
    return JSON.stringify({
        personId:           c.personId,
        handle:             c.handle,
        personPublicKey:    c.personPublicKey,
        communityNodeId:    c.communityNodeId,
        communityPublicKey: c.communityPublicKey,
        issuedAt:           c.issuedAt,
        expiresAt:          c.expiresAt,
    });
}

/**
 * Verify a PersonCredential against an expected community node ID and its
 * public key.
 *
 * @param credential         The credential to verify.
 * @param communityNodeId    Expected community node ID (from startup config).
 * @param communityPublicKey Hex SPKI DER public key (from /api/identity at startup).
 */
export function verifyPersonCredential(
    credential: PersonCredential,
    communityNodeId: string,
    communityPublicKey: string,
): boolean {
    if (credential.communityNodeId !== communityNodeId) return false;
    if (new Date(credential.expiresAt) < new Date()) return false;
    return NodeSigner.verify(credentialPayload(credential), credential.signature, communityPublicKey);
}

/**
 * Express middleware factory.
 *
 * Expects `Authorization: Bearer <base64url-encoded PersonCredential JSON>`
 *
 * On success, attaches the verified credential to `req.credential` and the
 * person's ID to `req.personId` for use by downstream handlers.
 *
 * @param getCommunityIdentity
 *   Returns the cached `{ nodeId, publicKey }` for the governing community.
 *   Called on every request so hot-reloads (e.g. after a key rotation) work
 *   without restarting the container.
 */
export function requirePersonCredential(
    getCommunityIdentity: () => { nodeId: string; publicKey: string },
): RequestHandler {
    return (req: Request, res: Response, next: NextFunction): void => {
        const header = req.headers["authorization"];
        if (!header?.startsWith("Bearer ")) {
            res.status(401).json({ error: "Authorization: Bearer <credential> required" });
            return;
        }

        let credential: PersonCredential;
        try {
            const json = Buffer.from(header.slice(7), "base64url").toString("utf-8");
            credential = JSON.parse(json) as PersonCredential;
        } catch {
            res.status(401).json({ error: "Malformed credential" });
            return;
        }

        const { nodeId, publicKey } = getCommunityIdentity();
        if (!verifyPersonCredential(credential, nodeId, publicKey)) {
            res.status(401).json({ error: "Credential invalid or expired" });
            return;
        }

        (req as Request & { credential: PersonCredential; personId: string }).credential = credential;
        (req as Request & { credential: PersonCredential; personId: string }).personId = credential.personId;
        next();
    };
}
