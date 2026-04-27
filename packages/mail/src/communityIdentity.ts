/**
 * Caches the governing community's node identity at startup.
 * Used by requirePersonCredential middleware to verify member credentials.
 */

interface CommunityIdentity {
    nodeId:    string;
    publicKey: string;
}

let cached: CommunityIdentity | null = null;

export function setCommunityIdentity(id: string, publicKey: string): void {
    cached = { nodeId: id, publicKey };
}

export function getCommunityIdentity(): { nodeId: string; publicKey: string } {
    if (!cached) throw new Error("[mail] Community identity not yet resolved");
    return cached;
}
