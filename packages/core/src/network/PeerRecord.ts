import { NodeType } from "./NodeIdentity.js";

/**
 * A node encountered on the network, as stored in the local peer registry.
 * Updated on every successful ping.
 */
export interface PeerRecord {
    id: string;
    type: NodeType;
    name: string;
    address: string;
    publicKey: string;
    firstSeenAt: Date;
    lastSeenAt: Date;
    lastLatencyMs: number | null;
    consecutiveFailures: number;  // reset to 0 on any successful ping
    healthy: boolean;
}
