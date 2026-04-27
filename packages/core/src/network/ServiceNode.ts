import { NodeService } from "../network/NodeService.js";
import { DataManifest } from "../storage/DataManifest.js";
import type { NodeConfig } from "../network/NodeIdentity.js";

/**
 * Configuration for a community-owned operational service node (bank, mail,
 * market, etc.).
 *
 * At startup the service:
 *   1. Initialises its NodeService identity.
 *   2. Initialises DataManifest signing.
 *   3. Resolves the governing community's node ID + public key by polling
 *      COMMUNITY_URL/api/identity with exponential backoff. This may be done
 *      blocking (await) or non-blocking (fire-and-forget).
 */
export interface ServiceNodeConfig {
    /** Short name for log prefixes, e.g. "bank", "mail", "market". */
    name: string;

    /** Listening port, e.g. 3001. */
    port: number;

    /** Data root directory. */
    dataDir: string;

    /** Community node base URL, e.g. "http://community:3002". */
    communityUrl: string;

    /**
     * Optional extra fields forwarded to NodeService.init.
     * type defaults to "infrastructure".
     */
    nodeConfig?: Partial<Omit<NodeConfig, "name" | "dataDir" | "seeds">>;

    /** Bootstrap peers (comma-separated string or pre-split array). */
    seeds?: string | string[];
}

/** Identity record cached after resolving the governing community. */
export interface CommunityIdentity {
    nodeId: string;
    publicKey: string;
}

/**
 * Resolve the governing community node's ID and public key.
 *
 * Polls `${communityUrl}/api/identity` with exponential backoff (5 s → 30 s).
 * Resolves as soon as the endpoint returns a valid response.
 *
 * @param communityUrl  Base URL of the community node (no trailing slash).
 * @param label         Log prefix, e.g. "[bank]".
 */
export async function resolveCommunityIdentity(
    communityUrl: string,
    label: string,
): Promise<CommunityIdentity> {
    const url = `${communityUrl.replace(/\/$/, "")}/api/identity`;
    for (let attempt = 1; ; attempt++) {
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const body = await res.json() as { id?: string; publicKey?: string };
            if (!body.id)        throw new Error("identity response missing id");
            if (!body.publicKey) throw new Error("identity response missing publicKey");
            console.log(`${label} resolved community identity: ${body.id}`);
            return { nodeId: body.id, publicKey: body.publicKey };
        } catch (err) {
            const wait = Math.min(30_000, attempt * 5_000);
            console.warn(
                `${label} community not reachable (attempt ${attempt}), ` +
                `retrying in ${wait / 1000}s — ${(err as Error).message}`,
            );
            await new Promise(r => setTimeout(r, wait));
        }
    }
}

/**
 * Initialise the shared infrastructure that every operational service needs:
 *   - NodeService (peer identity, network)
 *   - DataManifest (signed data)
 *
 * Call this once at the top of your `main()` before service-specific setup.
 */
export async function initServiceNode(cfg: ServiceNodeConfig): Promise<void> {
    const seeds = Array.isArray(cfg.seeds)
        ? cfg.seeds.filter(Boolean)
        : (cfg.seeds ?? "").split(",").filter(Boolean);

    await NodeService.getInstance().init({
        type:    "infrastructure",
        name:    process.env.NODE_NAME    ?? cfg.name,
        address: process.env.NODE_ADDRESS ?? `http://localhost:${cfg.port}`,
        dataDir: `${cfg.dataDir}/network`,
        seeds,
        ...cfg.nodeConfig,
    });

    DataManifest.getInstance().init(
        body => NodeService.getInstance().getSigner().signBody(body),
        NodeService.getInstance().getSigner().publicKeyHex,
    );
}
