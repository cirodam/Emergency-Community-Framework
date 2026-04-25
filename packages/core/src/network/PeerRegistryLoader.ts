import { PeerRecord } from "./PeerRecord.js";
import { NodeType } from "./NodeIdentity.js";
import { FileStore } from "../storage/FileStore.js";

interface PeerRecordDisk {
    id: string;
    type: NodeType;
    name: string;
    address: string;
    publicKey: string;
    firstSeenAt: string;
    lastSeenAt: string;
    lastLatencyMs: number | null;
    consecutiveFailures: number;
    healthy: boolean;
}

export class PeerRegistryLoader {
    private readonly store: FileStore;

    constructor(dataDir: string) {
        this.store = new FileStore(dataDir);
    }

    save(peer: PeerRecord): void {
        const record: PeerRecordDisk = {
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
        this.store.write(peer.id, record);
    }

    loadAll(): PeerRecord[] {
        return this.store.readAll<PeerRecordDisk>().map(r => ({
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
        }));
    }
}
