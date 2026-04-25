import { NodeIdentity } from "../network/NodeIdentity.js";
import { NodeSigner } from "../network/NodeSigner.js";
import { OwnershipCertificate } from "./OwnershipCertificate.js";

/** Default certificate lifetime: 90 days */
export const DEFAULT_CERT_TTL_MS = 90 * 24 * 60 * 60 * 1000;

/**
 * Canonical string representation of a certificate's signable fields.
 * Deterministic — same inputs always produce the same string.
 */
function signingPayload(cert: Omit<OwnershipCertificate, "signature">): string {
    return JSON.stringify({
        nodeId:        cert.nodeId,
        nodePublicKey: cert.nodePublicKey,
        ownerNodeId:   cert.ownerNodeId,
        ownerPublicKey:cert.ownerPublicKey,
        issuedAt:      cert.issuedAt,
        expiresAt:     cert.expiresAt,
    });
}

/**
 * Issue an ownership certificate from a heart node to a subsidiary node.
 *
 * @param nodeId         The subsidiary node's UUID
 * @param nodePublicKey  The subsidiary node's hex SPKI DER public key
 * @param owner          The heart node's NodeIdentity
 * @param ownerSigner    The heart node's NodeSigner (holds the private key)
 * @param ttlMs          Certificate lifetime in ms (default: 90 days)
 */
export function issueCertificate(
    nodeId: string,
    nodePublicKey: string,
    owner: NodeIdentity,
    ownerSigner: NodeSigner,
    ttlMs: number = DEFAULT_CERT_TTL_MS,
): OwnershipCertificate {
    const now = new Date();
    const cert: Omit<OwnershipCertificate, "signature"> = {
        nodeId,
        nodePublicKey,
        ownerNodeId:    owner.id,
        ownerPublicKey: owner.publicKey,
        issuedAt:       now.toISOString(),
        expiresAt:      new Date(now.getTime() + ttlMs).toISOString(),
    };
    return { ...cert, signature: ownerSigner.signBody(signingPayload(cert)) };
}

/**
 * Verify an ownership certificate.
 *
 * Checks:
 *   1. The certificate has not expired
 *   2. The signature is a valid Ed25519 signature over the canonical payload,
 *      produced by the private key corresponding to `ownerPublicKey`
 *
 * Does NOT check whether the owner is itself a trusted node — that is the
 * peer registry's responsibility (transitive trust via federation).
 */
export function verifyCertificate(cert: OwnershipCertificate): boolean {
    if (new Date(cert.expiresAt).getTime() < Date.now()) {
        return false;
    }

    const payload = signingPayload(cert);
    return NodeSigner.verify(payload, cert.signature, cert.ownerPublicKey);
}
