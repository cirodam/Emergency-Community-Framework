import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync, renameSync } from "fs";
import { join, relative, dirname } from "path";
import type { Request, Response, NextFunction, RequestHandler } from "express";
import { NodeSigner } from "./NodeSigner.js";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ClusterConfig {
    /** This node's public-facing URL, e.g. "http://node-a.example.org:3002". */
    myUrl: string;
    /**
     * Numeric priority — lower value wins leader election.
     * Set CLUSTER_PRIORITY=1 on the preferred primary, 2 on replicas, etc.
     * Default: 100.
     */
    priority: number;
    /** Public-facing URLs of the other community nodes in this cluster. */
    peers: string[];
    /** Signer used to authenticate inter-cluster requests (use the community signer). */
    signer: NodeSigner;
    /** Root data directory — snapshot excludes data/network/. */
    dataDir: string;
    /** How often to heartbeat cluster peers (ms). Default: 5 000. */
    heartbeatMs?: number;
    /** How often replicas pull a snapshot from the primary (ms). Default: 30 000. */
    syncIntervalMs?: number;
}

export interface ClusterStatusResponse {
    url: string;
    priority: number;
    role: "primary" | "replica" | "standalone";
    primaryUrl: string | null;
    peers: Array<{
        url: string;
        healthy: boolean;
        priority: number | null;
        lastSeenAt: string | null;
    }>;
}

interface PeerState {
    url: string;
    priority: number | null;
    healthy: boolean;
    lastSeenAt: Date | null;
}

// ── ClusterService ────────────────────────────────────────────────────────────

/**
 * Manages multi-node redundancy for community nodes that share the same
 * community key pair.
 *
 * Responsibilities:
 *   - Leader election via periodic heartbeats (lowest priority number wins)
 *   - Write forwarding — replicas redirect mutating HTTP requests to the primary
 *   - State replication — replicas periodically pull the primary's data snapshot
 *   - Cold-start sync — new replicas hydrate from the primary before serving traffic
 *
 * Usage (in server.ts):
 *   const cluster = ClusterService.getInstance();
 *   await cluster.init({ myUrl, priority, peers, signer, dataDir });
 *   if (!cluster.isPrimary()) await cluster.syncFromPrimary();
 *   app.use("/api", cluster.replicaWriteGuard(), communityRoutes);
 *   app.use("/api/cluster", clusterRouter);
 */
export class ClusterService {
    private static _instance: ClusterService | null = null;

    private myUrl          = "";
    private myPriority     = 100;
    private peers: string[] = [];
    private peerStates     = new Map<string, PeerState>();
    private signer: NodeSigner | null = null;
    private dataDir        = "";
    private heartbeatMs    = 5_000;
    private syncIntervalMs = 30_000;
    private heartbeatTimer: NodeJS.Timeout | null = null;
    private syncTimer: NodeJS.Timeout | null = null;
    private initialized    = false;

    private constructor() {}

    static getInstance(): ClusterService {
        if (!ClusterService._instance) ClusterService._instance = new ClusterService();
        return ClusterService._instance;
    }

    // ── Init ──────────────────────────────────────────────────────────────────

    async init(cfg: ClusterConfig): Promise<void> {
        this.myUrl          = cfg.myUrl.replace(/\/$/, "");
        this.myPriority     = cfg.priority;
        this.signer         = cfg.signer;
        this.dataDir        = cfg.dataDir;
        this.heartbeatMs    = cfg.heartbeatMs    ?? 5_000;
        this.syncIntervalMs = cfg.syncIntervalMs ?? 30_000;
        this.initialized    = true;

        // Exclude self from peer list
        this.peers = cfg.peers
            .map(p => p.replace(/\/$/, ""))
            .filter(p => p !== this.myUrl);

        for (const url of this.peers) {
            this.peerStates.set(url, { url, priority: null, healthy: false, lastSeenAt: null });
        }

        if (this.peers.length > 0) {
            // Run one immediate round so we know the topology before first requests
            await this.heartbeatAll();
            this.heartbeatTimer = setInterval(() => void this.heartbeatAll(), this.heartbeatMs);

            // Replicas keep pulling snapshots so they can take over quickly
            this.syncTimer = setInterval(() => {
                if (!this.isPrimary()) void this.syncFromPrimary();
            }, this.syncIntervalMs);

            console.log(
                `[cluster] initialized — priority=${this.myPriority} ` +
                `peers=[${this.peers.join(", ")}] ` +
                `role=${this.isPrimary() ? "primary" : "replica"}`,
            );
        } else {
            console.log("[cluster] no peers configured — running in standalone mode");
        }
    }

    // ── Role queries ──────────────────────────────────────────────────────────

    /** True when no cluster peers are configured. */
    isStandalone(): boolean {
        return !this.initialized || this.peers.length === 0;
    }

    /**
     * True when this node should accept writes.
     *
     * A node is primary if it has the lowest priority among all currently
     * healthy peers (including itself). Ties are broken alphabetically by URL
     * so that election is deterministic without coordination.
     *
     * Before the first heartbeat completes, all peers are marked unhealthy,
     * so every node temporarily considers itself primary. This brief window
     * is acceptable because replicas should be started after the primary and
     * will catch up on the first sync.
     */
    isPrimary(): boolean {
        if (this.isStandalone()) return true;

        for (const [, peer] of this.peerStates) {
            if (!peer.healthy || peer.priority === null) continue;
            if (peer.priority < this.myPriority) return false;
            if (peer.priority === this.myPriority && peer.url < this.myUrl) return false;
        }
        return true;
    }

    /** URL of the current primary, or this node's URL if standalone/unknown. */
    getPrimaryUrl(): string {
        if (this.isStandalone() || this.isPrimary()) return this.myUrl;

        let bestUrl = this.myUrl;
        let bestPriority = this.myPriority;

        for (const [, peer] of this.peerStates) {
            if (!peer.healthy || peer.priority === null) continue;
            if (
                peer.priority < bestPriority ||
                (peer.priority === bestPriority && peer.url < bestUrl)
            ) {
                bestPriority = peer.priority;
                bestUrl      = peer.url;
            }
        }
        return bestUrl;
    }

    // ── Express middleware ────────────────────────────────────────────────────

    /**
     * Redirect mutating requests (POST/PUT/PATCH/DELETE) to the primary.
     * GET/HEAD/OPTIONS always pass through for local serving.
     */
    replicaWriteGuard(): RequestHandler {
        return (req: Request, res: Response, next: NextFunction): void => {
            // Reads are always served locally
            if (
                req.method === "GET"    ||
                req.method === "HEAD"   ||
                req.method === "OPTIONS"
            ) {
                next();
                return;
            }
            if (this.isPrimary()) {
                next();
                return;
            }
            const primaryUrl = this.getPrimaryUrl();
            // Forward to primary with same method and body
            res.redirect(307, `${primaryUrl}${req.originalUrl}`);
        };
    }

    // ── Route handlers ────────────────────────────────────────────────────────

    /** GET /api/cluster/status — returns this node's role and peer health. */
    statusHandler(): RequestHandler {
        return (_req: Request, res: Response): void => {
            const role: "primary" | "replica" | "standalone" =
                this.isStandalone() ? "standalone" :
                this.isPrimary()    ? "primary"    : "replica";

            const response: ClusterStatusResponse = {
                url:        this.myUrl,
                priority:   this.myPriority,
                role,
                primaryUrl: this.getPrimaryUrl(),
                peers: Array.from(this.peerStates.values()).map(p => ({
                    url:        p.url,
                    healthy:    p.healthy,
                    priority:   p.priority,
                    lastSeenAt: p.lastSeenAt?.toISOString() ?? null,
                })),
            };
            res.json(response);
        };
    }

    /**
     * GET /api/cluster/snapshot — returns all data files as a JSON map.
     * Only the primary serves this. Mount behind community-key auth middleware.
     */
    snapshotHandler(): RequestHandler {
        return (_req: Request, res: Response): void => {
            if (!this.isPrimary()) {
                res.status(503).json({ error: "This node is not the primary — request the snapshot from the primary" });
                return;
            }
            try {
                const files = this.walkDataDir();
                res.json({ files });
            } catch (err) {
                res.status(500).json({ error: (err as Error).message });
            }
        };
    }

    // ── Sync ─────────────────────────────────────────────────────────────────

    /**
     * Pull a full state snapshot from the primary and write it to local disk.
     * Skips silently if this node is the primary.
     *
     * Call this before booting services for a clean cold-start on a replica.
     * Also called periodically in the background to keep replica state fresh.
     */
    async syncFromPrimary(): Promise<void> {
        const primaryUrl = this.getPrimaryUrl();
        if (!primaryUrl || primaryUrl === this.myUrl) return;

        try {
            const sig = this.signer!.signBody("");
            const res = await fetch(`${primaryUrl}/api/cluster/snapshot`, {
                headers: { "x-node-signature": sig },
                signal:  AbortSignal.timeout(30_000),
            });
            if (!res.ok) {
                console.warn(`[cluster] snapshot from ${primaryUrl} failed: HTTP ${res.status}`);
                return;
            }
            const { files } = await res.json() as { files: Record<string, string> };
            let written = 0;
            for (const [rel, content] of Object.entries(files)) {
                const abs = join(this.dataDir, rel);
                const dir = dirname(abs);
                if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
                const tmp = `${abs}.tmp`;
                writeFileSync(tmp, content, "utf-8");
                renameSync(tmp, abs);
                written++;
            }
            console.log(`[cluster] synced ${written} files from primary (${primaryUrl})`);
        } catch (err) {
            console.warn(`[cluster] sync from ${primaryUrl} failed: ${(err as Error).message}`);
        }
    }

    // ── Internal ──────────────────────────────────────────────────────────────

    /** Walk dataDir recursively, excluding the network/ subdirectory. */
    private walkDataDir(): Record<string, string> {
        const result: Record<string, string> = {};
        this.walkDir(this.dataDir, this.dataDir, result);
        return result;
    }

    private walkDir(root: string, dir: string, out: Record<string, string>): void {
        if (!existsSync(dir)) return;
        const entries = readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const abs = join(dir, entry.name);
            const rel = relative(root, abs);

            // Never sync node-specific identity/keypair/peer data
            if (rel === "network" || rel.startsWith("network/")) continue;

            if (entry.isDirectory()) {
                this.walkDir(root, abs, out);
            } else if (entry.isFile() && entry.name.endsWith(".json")) {
                try {
                    out[rel] = readFileSync(abs, "utf-8");
                } catch {
                    // skip unreadable files
                }
            }
        }
    }

    private async heartbeatAll(): Promise<void> {
        await Promise.allSettled(this.peers.map(url => this.heartbeatOne(url)));
    }

    private async heartbeatOne(url: string): Promise<void> {
        const prev = this.peerStates.get(url);
        try {
            const res = await fetch(`${url}/api/cluster/status`, {
                signal: AbortSignal.timeout(this.heartbeatMs),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const body = await res.json() as ClusterStatusResponse;
            this.peerStates.set(url, {
                url,
                priority:   body.priority,
                healthy:    true,
                lastSeenAt: new Date(),
            });
        } catch {
            // Mark unhealthy if we haven't heard from this peer in > 3 heartbeat intervals
            const staleMs  = prev?.lastSeenAt ? Date.now() - prev.lastSeenAt.getTime() : Infinity;
            const healthy  = staleMs < this.heartbeatMs * 3;
            this.peerStates.set(url, {
                url,
                priority:   prev?.priority   ?? null,
                healthy,
                lastSeenAt: prev?.lastSeenAt ?? null,
            });
        }
    }
}
