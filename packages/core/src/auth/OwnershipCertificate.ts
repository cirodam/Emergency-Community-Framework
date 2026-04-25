/**
 * An ownership certificate issued by a heart node to a subsidiary node.
 *
 * The certificate establishes that `nodeId` is authorized to operate under
 * the authority of `ownerNodeId`. It is verified offline — no live connection
 * to the heart node is required, only its public key.
 *
 * Certificates expire. The heart node must periodically reissue them.
 * Expiry is the revocation mechanism — if a community dissolves or revokes
 * a subsidiary, it simply stops renewing the certificate.
 */
export interface OwnershipCertificate {
    nodeId: string;        // The node being credentialed
    nodePublicKey: string; // That node's hex SPKI DER Ed25519 public key
    ownerNodeId: string;   // The heart node issuing the certificate
    ownerPublicKey: string;// The heart node's hex SPKI DER Ed25519 public key
    issuedAt: string;      // ISO 8601
    expiresAt: string;     // ISO 8601
    signature: string;     // Hex Ed25519 signature over canonical payload, signed by owner
}
