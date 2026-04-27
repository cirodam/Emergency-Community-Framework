/**
 * The community node IS the identity provider — its own NodeService identity
 * is what PersonCredentials are issued against.
 *
 * requirePersonCredential(getCommunityIdentity) can be used on any route that
 * needs to verify a logged-in member's credential.
 */
import { NodeService } from "@ecf/core";

export function getCommunityIdentity(): { nodeId: string; publicKey: string } {
    const identity = NodeService.getInstance().getIdentity();
    const signer   = NodeService.getInstance().getSigner();
    return { nodeId: identity.id, publicKey: signer.publicKeyHex };
}
