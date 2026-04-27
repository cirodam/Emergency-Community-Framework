/**
 * Factory for satellite services (bank, market, mail, …) that need to cache
 * the governing community's node identity at startup before they can verify
 * person credentials.
 *
 * Usage:
 *   export const { setCommunityIdentity, getCommunityIdentity } =
 *       createCommunityIdentityCache("bank");
 */
export function createCommunityIdentityCache(serviceName: string): {
    setCommunityIdentity(nodeId: string, publicKey: string): void;
    getCommunityIdentity(): { nodeId: string; publicKey: string };
} {
    let cached: { nodeId: string; publicKey: string } | null = null;

    return {
        setCommunityIdentity(nodeId: string, publicKey: string): void {
            cached = { nodeId, publicKey };
        },
        getCommunityIdentity(): { nodeId: string; publicKey: string } {
            if (!cached) {
                throw new Error(`[${serviceName}] Community identity not yet resolved`);
            }
            return cached;
        },
    };
}
