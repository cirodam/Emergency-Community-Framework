import { PeerRecord } from "./PeerRecord.js";
import { NodeType } from "./NodeIdentity.js";
import { BaseLoader } from "../storage/BaseLoader.js";

interface PeerRecordDisk {
    id:                  string;
    type:                NodeType;
    name:                string;
    address:             string;
    publicKey:           string;
    firstSeenAt:         string;
    lastSeenAt:          string;
    lastLatencyMs:       number | null;
    consecutiveFailures: number;
    healthy:             boolean;
}

export class PeerRegistryLoader extends BaseLoader<PeerRecordDisk, PeerRecord> {
    protected serialize(peer: PeerRecord): PeerRecordDisk {
        return {
            id:                  peer.id,
            type:                peer.type,
            name:                peer.name,
            address:             peer.address,
            publicKey:           peer.publicKey,
            firstSeenAt:         peer.firstSeenAt.toISOString(),
            lastSeenAt:          peer.lastSeenAt.toISOString(),
            lastLatencyMs:       peer.lastLatencyMs,
            consecutiveFailures: peer.consecutiveFailures,
            healthy:             peer.healthy,
        };
    }

    protected deserialize(r: PeerRecordDisk): PeerRecord {
        return {
            id:                  r.id,
            type:                r.type,
            name:                r.name,
            address:             r.address,
            publicKey:           r.publicKey,
            firstSeenAt:         new Date(r.firstSeenAt),
            lastSeenAt:          new Date(r.lastSeenAt),
            lastLatencyMs:       r.lastLatencyMs,
            consecutiveFailures: r.consecutiveFailures,
            healthy:             r.healthy,
        };
    }
}
