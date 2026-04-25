import { randomUUID } from "crypto";
import { NodeConfig, NodeIdentity, DEFAULT_NODE_CONFIG } from "./NodeIdentity.js";
import { PeerRecord } from "./PeerRecord.js";
import { PeerRegistry } from "./PeerRegistry.js";
import { PeerRegistryLoader } from "./PeerRegistryLoader.js";
import { NodeSigner } from "./NodeSigner.js";
import { FileStore } from "../storage/FileStore.js";

/**
 * NodeService is the singleton that owns this node's identity and manages its
 * view of the network.
 *
 * Responsibilities:
 *   - Generate and persist this node's NodeIdentity on first boot
 *   - Load the PeerRegistry from disk on startup
 *   - Run the bootstrap/announce crawl to join the network
 *   - Run periodic health pings on known peers
 *
 * Usage:
 *   const node = NodeService.getInstance();
 *   await node.init(config);  // call once at startup
 */
export class NodeService {
    private static instance: NodeService;

    private identity: NodeIdentity | null = null;
    private registry: PeerRegistry | null = null;
    private loader: PeerRegistryLoader | null = null;
    private signer: NodeSigner | null = null;
    private config: Required<NodeConfig> | null = null;
    private pingTimer: NodeJS.Timeout | null = null;

    private constructor() {}

    static getInstance(): NodeService {
        if (!NodeService.instance) {
            NodeService.instance = new NodeService();
        }
        return NodeService.instance;
    }

    // ── Startup ───────────────────────────────────────────────────────────────

    async init(config: NodeConfig): Promise<void> {
        this.config = { ...DEFAULT_NODE_CONFIG, ...config } as Required<NodeConfig>;
        this.loader = new PeerRegistryLoader(`${config.dataDir}/peers`);
        this.registry = new PeerRegistry(
            this.config.peerCap,
            this.config.maxPingFailures,
            this.config.evictAfterDays
        );

        const store = new FileStore(config.dataDir);
        this.signer   = this.loadOrCreateSigner(store);
        this.identity = this.loadOrCreateIdentity(store, config);
        this.registry.load(this.loader.loadAll());

        await this.bootstrap();
        this.startPingScheduler();
    }

    // ── Identity ──────────────────────────────────────────────────────────────

    getIdentity(): NodeIdentity {
        if (!this.identity) throw new Error("NodeService not initialized");
        return this.identity;
    }

    getSigner(): NodeSigner {
        if (!this.signer) throw new Error("NodeService not initialized");
        return this.signer;
    }

    private loadOrCreateSigner(store: FileStore): NodeSigner {
        const existing = store.read<{ privateKeyDer: string; publicKeyHex: string }>("keypair");
        if (existing) return NodeSigner.fromStored(existing.privateKeyDer, existing.publicKeyHex);
        const signer = NodeSigner.generate();
        store.write("keypair", { privateKeyDer: signer.privateKeyDer, publicKeyHex: signer.publicKeyHex });
        return signer;
    }

    private loadOrCreateIdentity(store: FileStore, config: NodeConfig): NodeIdentity {
        type Stored = Omit<NodeIdentity, "createdAt"> & { createdAt: string };
        const existing = store.read<Stored>("identity");
        if (existing) return { ...existing, createdAt: new Date(existing.createdAt) };
        const identity: NodeIdentity = {
            id:        randomUUID(),
            type:      config.type,
            name:      config.name,
            address:   config.address,
            publicKey: this.signer!.publicKeyHex,
            createdAt: new Date(),
        };
        store.write("identity", identity);
        return identity;
    }

    // ── Registry access ───────────────────────────────────────────────────────

    getRegistry(): PeerRegistry {
        if (!this.registry) throw new Error("NodeService not initialized");
        return this.registry;
    }

    /** Called by NetworkController when a peer announces itself. */
    handleAnnounce(identity: NodeIdentity): void {
        const peer = this.registry!.upsert(identity);
        this.loader?.save(peer);
    }

    /** Called by NetworkController to serve gossip requests. */
    getPeerSample(excludeId?: string): PeerRecord[] {
        return this.registry!.getSample(this.config!.gossipSampleSize, excludeId);
    }

    // ── Bootstrap ─────────────────────────────────────────────────────────────

    /**
     * Announce to seed nodes and crawl their peer lists for 2 hops.
     * Errors on individual seeds are logged and skipped — a single bad seed
     * must not prevent the rest of the bootstrap from completing.
     */
    private async bootstrap(): Promise<void> {
        const seeds = this.config!.seeds;
        if (seeds.length === 0) return;
        console.log(`[network] Bootstrapping from ${seeds.length} seed(s)...`);

        const visited = new Set<string>();

        const hop1Addresses: string[] = [];
        for (const address of seeds) {
            const peers = await this.announceAndFetch(address);
            for (const peer of peers) {
                if (!visited.has(peer.id)) hop1Addresses.push(peer.address);
            }
        }

        for (const address of hop1Addresses) {
            if (visited.has(address)) continue;
            visited.add(address);
            await this.announceAndFetch(address);
        }

        console.log(`[network] Bootstrap complete. Known peers: ${this.registry!.size()}`);
    }

    /**
     * POST our identity to a peer's /node/announce, then GET their peer list.
     * Returns the peers they shared (empty array on any error).
     */
    private async announceAndFetch(address: string): Promise<NodeIdentity[]> {
        const base = address.replace(/\/$/, "");
        try {
            const body = JSON.stringify(this.identity);
            const signature = this.signer!.signBody(body);

            await fetch(`${base}/node/announce`, {
                method:  "POST",
                headers: {
                    "Content-Type":     "application/json",
                    "x-node-signature": signature,
                },
                body,
                signal: AbortSignal.timeout(this.config!.pingTimeoutMs),
            });

            const res = await fetch(
                `${base}/node/peers?excludeId=${encodeURIComponent(this.identity!.id)}`,
                { signal: AbortSignal.timeout(this.config!.pingTimeoutMs) }
            );
            if (!res.ok) return [];

            const peers = await res.json() as NodeIdentity[];
            for (const peer of peers) {
                const record = this.registry!.upsert(peer);
                this.loader?.save(record);
            }
            return peers;
        } catch (err) {
            console.warn(`[network] Could not reach ${base}: ${(err as Error).message}`);
            return [];
        }
    }

    // ── Health pings ──────────────────────────────────────────────────────────

    private startPingScheduler(): void {
        this.pingTimer = setInterval(
            () => void this.pingAll(),
            this.config!.pingIntervalMs
        );
    }

    private async pingAll(): Promise<void> {
        const peers = this.registry!.getAll();
        await Promise.allSettled(peers.map(p => this.pingOne(p)));
    }

    private async pingOne(peer: { id: string; address: string }): Promise<void> {
        const base = peer.address.replace(/\/$/, "");
        const start = Date.now();
        try {
            const body = JSON.stringify({
                fromId:      this.identity!.id,
                fromAddress: this.identity!.address,
            });
            const signature = this.signer!.signBody(body);
            const res = await fetch(`${base}/node/ping`, {
                method:  "POST",
                headers: {
                    "Content-Type":     "application/json",
                    "x-node-signature": signature,
                },
                body,
                signal: AbortSignal.timeout(this.config!.pingTimeoutMs),
            });
            if (res.ok) {
                this.registry!.recordSuccess(peer.id, Date.now() - start);
                this.loader?.save(this.registry!.get(peer.id)!);
            } else {
                this.recordAndPersistFailure(peer.id);
            }
        } catch {
            this.recordAndPersistFailure(peer.id);
        }
    }

    private recordAndPersistFailure(peerId: string): void {
        this.registry!.recordFailure(peerId);
        const record = this.registry!.get(peerId);
        if (record) this.loader?.save(record);
    }

    stop(): void {
        if (this.pingTimer) clearInterval(this.pingTimer);
    }
}
