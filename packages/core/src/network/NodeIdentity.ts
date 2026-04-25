export type NodeType = "community" | "infrastructure" | "federation" | "forum";

/**
 * The stable identity of a node on the Fabric network.
 * Written to disk on first boot and never changed.
 */
export interface NodeIdentity {
    id: string;          // UUID, generated once
    type: NodeType;
    name: string;        // Human-readable, e.g. "Maplewood Commons"
    address: string;     // Public base URL, e.g. "https://maplewood.example.org"
    publicKey: string;   // Hex-encoded SPKI DER Ed25519 public key
    createdAt: Date;
}

/**
 * Startup configuration for this node.
 * Loaded from environment variables or a config file.
 */
export interface NodeConfig {
    type: NodeType;
    name: string;
    address: string;
    dataDir: string;           // e.g. "data/network"
    seeds: string[];           // Bootstrap peer addresses
    peerCap?: number;          // Max peers to retain in registry (default 10_000)
    pingIntervalMs?: number;   // How often to health-check peers (default 5 min)
    pingTimeoutMs?: number;    // Per-ping timeout (default 5s)
    maxPingFailures?: number;  // Failures before marking unhealthy (default 3)
    evictAfterDays?: number;   // Days unhealthy before eligible for eviction (default 30)
    gossipSampleSize?: number; // Peers returned by GET /node/peers (default 50)
}

export const DEFAULT_NODE_CONFIG: Partial<NodeConfig> = {
    peerCap:          10_000,
    pingIntervalMs:   5 * 60 * 1000,
    pingTimeoutMs:    5_000,
    maxPingFailures:  3,
    evictAfterDays:   30,
    gossipSampleSize: 50,
};
