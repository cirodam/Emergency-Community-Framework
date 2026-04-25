import {
    generateKeyPairSync,
    sign,
    verify,
    createPrivateKey,
    createPublicKey,
    type KeyObject,
} from "crypto";

/**
 * Ed25519 signing and verification for cross-node requests.
 *
 * Each node generates a keypair on first boot. The public key is included in
 * NodeIdentity so peers can verify inbound requests. The private key stays
 * on disk only — it is never sent over the wire.
 *
 * Storage format: DER bytes encoded as lowercase hex strings.
 *   Private key → PKCS8 DER
 *   Public key  → SPKI DER
 */
export class NodeSigner {
    private constructor(
        private readonly privateKey: KeyObject,
        /** Hex-encoded SPKI DER public key. Stored in NodeIdentity and shared openly. */
        readonly publicKeyHex: string,
        /** Hex-encoded PKCS8 DER private key. Stored on disk only, never transmitted. */
        readonly privateKeyDer: string,
    ) {}

    // ── Factory ───────────────────────────────────────────────────────────────

    /** Generate a fresh Ed25519 keypair. */
    static generate(): NodeSigner {
        const { privateKey, publicKey } = generateKeyPairSync("ed25519");
        const privDer = privateKey.export({ type: "pkcs8", format: "der" }).toString("hex");
        const pubHex  = publicKey.export({ type: "spki",  format: "der" }).toString("hex");
        return new NodeSigner(privateKey, pubHex, privDer);
    }

    /** Restore a signer from the persisted hex-encoded DER values. */
    static fromStored(privateKeyDer: string, publicKeyHex: string): NodeSigner {
        const privateKey = createPrivateKey({
            key:    Buffer.from(privateKeyDer, "hex"),
            format: "der",
            type:   "pkcs8",
        });
        return new NodeSigner(privateKey, publicKeyHex, privateKeyDer);
    }

    // ── Signing ───────────────────────────────────────────────────────────────

    /**
     * Sign the raw request body string.
     * Returns a hex-encoded Ed25519 signature suitable for the
     * `x-node-signature` header.
     */
    signBody(body: string): string {
        return sign(null, Buffer.from(body, "utf-8"), this.privateKey).toString("hex");
    }

    // ── Verification ─────────────────────────────────────────────────────────

    /**
     * Verify a signature over a raw request body.
     * @param body         The raw request body string.
     * @param signatureHex Hex-encoded signature from `x-node-signature`.
     * @param publicKeyHex Hex-encoded SPKI DER public key from NodeIdentity.
     */
    static verify(body: string, signatureHex: string, publicKeyHex: string): boolean {
        try {
            const publicKey = createPublicKey({
                key:    Buffer.from(publicKeyHex, "hex"),
                format: "der",
                type:   "spki",
            });
            return verify(
                null,
                Buffer.from(body, "utf-8"),
                publicKey,
                Buffer.from(signatureHex, "hex"),
            );
        } catch {
            return false;
        }
    }
}
