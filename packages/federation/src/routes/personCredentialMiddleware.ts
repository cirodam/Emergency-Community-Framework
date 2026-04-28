import { type Request, type Response, type NextFunction, type RequestHandler } from "express";
import { NodeSigner } from "@ecf/core";
import type { PersonCredential } from "@ecf/core";
import { FederationMemberService } from "../FederationMemberService.js";
import type { FederationMember } from "../FederationMember.js";

export type FederationPersonRequest = Request & {
    federationPersonCredential: PersonCredential;
    federationMember: FederationMember;
};

/**
 * Verify a PersonCredential issued by any member community of this federation.
 *
 * The credential is looked up by its embedded `communityPublicKey`, which is
 * matched against the stored `communityPublicKey` for each member.  This is
 * cluster-safe: all replicas of a community share the same key, so it does not
 * matter which node actually issued the credential.
 *
 * Expected header:
 *   Authorization: Bearer <base64url-encoded PersonCredential JSON>
 *
 * On success attaches:
 *   req.federationPersonCredential — the verified credential
 *   req.federationMember           — the member community record
 */
export function requireFederationMemberPerson(): RequestHandler {
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

        if (!credential.communityPublicKey) {
            res.status(401).json({ error: "Credential missing communityPublicKey" });
            return;
        }

        if (new Date(credential.expiresAt) < new Date()) {
            res.status(401).json({ error: "Credential expired" });
            return;
        }

        // Look up the issuing community by its public key
        const member = FederationMemberService.getInstance().getByPublicKey(credential.communityPublicKey);
        if (!member) {
            res.status(401).json({ error: "Credential issued by an unknown or non-member community" });
            return;
        }

        // Verify the Ed25519 signature
        const payload = JSON.stringify({
            personId:           credential.personId,
            handle:             credential.handle,
            personPublicKey:    credential.personPublicKey,
            communityNodeId:    credential.communityNodeId,
            communityPublicKey: credential.communityPublicKey,
            issuedAt:           credential.issuedAt,
            expiresAt:          credential.expiresAt,
        });

        if (!NodeSigner.verify(payload, credential.signature, member.communityPublicKey)) {
            res.status(401).json({ error: "Invalid credential signature" });
            return;
        }

        (req as FederationPersonRequest).federationPersonCredential = credential;
        (req as FederationPersonRequest).federationMember           = member;
        next();
    };
}
