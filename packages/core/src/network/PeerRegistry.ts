import { NodeIdentity, NodeType } from "./NodeIdentity.js";
import { PeerRecord } from "./PeerRecord.js";

/**
 * In-memory peer registry with a cap and eviction policy.
 *
 * Cap/eviction rules:
 *   - Healthy, recently-seen peers are never evicted.
 *   - When the cap is reached, the oldest unhealthy peers are evicted first.
 *   - Peers unhealthy for > evictAfterDays are eligible regardless of cap.
 *
 * Persistence is handled externally by PeerRegistryLoader.
 */
export class PeerRegistry {
    private peers: Map<string, PeerRecord> = new Map();

    constructor(
        private readonly cap: number = 10_000,
        private readonly maxPingFailures: number = 3,
        private readonly evictAfterDays: number = 30
    ) {}

    // ── Mutations ─────────────────────────────────────────────────────────────

    /**
     * Add or update a peer from a NodeIdentity (e.g. on announce).
     * If the peer is already known, updates name/address but preserves health state.
     */
    upsert(identity: NodeIdentity): PeerRecord {
        const existing = this.peers.get(identity.id);
        if (existing) {
            existing.name = identity.name;
            existing.address = identity.address;
            existing.lastSeenAt = new Date();
            return existing;
        }

        const record: PeerRecord = {
            id:                  identity.id,
            type:                identity.type,
            name:                identity.name,
            address:             identity.address,
            publicKey:           identity.publicKey,
            firstSeenAt:         new Date(),
            lastSeenAt:          new Date(),
            lastLatencyMs:       null,
            consecutiveFailures: 0,
            healthy:             true,
        };

        if (this.peers.size >= this.cap) this.evict();
        this.peers.set(record.id, record);
        return record;
    }

    /** Record a successful ping result. */
    recordSuccess(peerId: string, latencyMs: number): void {
        const peer = this.peers.get(peerId);
        if (!peer) return;
        peer.lastSeenAt = new Date();
        peer.lastLatencyMs = latencyMs;
        peer.consecutiveFailures = 0;
        peer.healthy = true;
    }

    /** Record a failed ping. Marks unhealthy after maxPingFailures. */
    recordFailure(peerId: string): void {
        const peer = this.peers.get(peerId);
        if (!peer) return;
        peer.consecutiveFailures++;
        if (peer.consecutiveFailures >= this.maxPingFailures) {
            peer.healthy = false;
        }
    }

    // ── Queries ───────────────────────────────────────────────────────────────

    get(peerId: string): PeerRecord | undefined {
        return this.peers.get(peerId);
    }

    has(peerId: string): boolean {
        return this.peers.has(peerId);
    }

    getAll(): PeerRecord[] {
        return Array.from(this.peers.values());
    }

    getHealthy(): PeerRecord[] {
        return this.getAll().filter(p => p.healthy);
    }

    /** Returns a random sample of healthy peers for gossip responses. */
    getSample(size: number, excludeId?: string): PeerRecord[] {
        const healthy = this.getHealthy().filter(p => p.id !== excludeId);
        if (healthy.length <= size) return healthy;
        // Fisher-Yates partial shuffle
        for (let i = healthy.length - 1; i > healthy.length - 1 - size; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [healthy[i], healthy[j]] = [healthy[j], healthy[i]];
        }
        return healthy.slice(healthy.length - size);
    }

    getByType(type: NodeType): PeerRecord[] {
        return this.getAll().filter(p => p.type === type);
    }

    size(): number {
        return this.peers.size;
    }

    // ── Eviction ──────────────────────────────────────────────────────────────

    /**
     * Remove peers that have been unhealthy for longer than evictAfterDays,
     * or the oldest unhealthy peer if none meet that threshold (cap enforcement).
     */
    private evict(): void {
        const cutoff = Date.now() - this.evictAfterDays * 24 * 60 * 60 * 1000;
        const unhealthy = this.getAll()
            .filter(p => !p.healthy)
            .sort((a, b) => a.lastSeenAt.getTime() - b.lastSeenAt.getTime());

        const expired = unhealthy.filter(p => p.lastSeenAt.getTime() < cutoff);
        const toEvict = expired.length > 0 ? expired[0] : unhealthy[0];
        if (toEvict) this.peers.delete(toEvict.id);
    }

    // ── Bulk load (used by PeerRegistryLoader) ────────────────────────────────

    load(records: PeerRecord[]): void {
        for (const r of records) {
            this.peers.set(r.id, r);
        }
    }
}
