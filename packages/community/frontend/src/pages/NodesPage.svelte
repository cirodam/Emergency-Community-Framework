<script lang="ts">
    import { getNodeIdentity, getNodePeers } from "../lib/api.js";
    import type { NodeIdentityDto, PeerRecordDto } from "../lib/api.js";

    let identity: NodeIdentityDto | null = $state(null);
    let peers: PeerRecordDto[] = $state([]);
    let loading = $state(true);
    let error = $state("");

    async function load() {
        loading = true;
        error = "";
        try {
            [identity, peers] = await Promise.all([getNodeIdentity(), getNodePeers()]);
        } catch (e) {
            error = e instanceof Error ? e.message : "Failed to load network info";
        } finally {
            loading = false;
        }
    }

    $effect(() => { load(); });

    function formatDate(iso: string): string {
        return new Date(iso).toLocaleString(undefined, {
            year: "numeric", month: "short", day: "numeric",
            hour: "2-digit", minute: "2-digit",
        });
    }

    function relativeTime(iso: string): string {
        const ms = Date.now() - new Date(iso).getTime();
        const s = Math.floor(ms / 1000);
        if (s < 60)  return `${s}s ago`;
        const m = Math.floor(s / 60);
        if (m < 60)  return `${m}m ago`;
        const h = Math.floor(m / 60);
        if (h < 24)  return `${h}h ago`;
        return `${Math.floor(h / 24)}d ago`;
    }

    function typeLabel(t: string): string {
        return t.charAt(0).toUpperCase() + t.slice(1);
    }

    const healthyPeers   = $derived(peers.filter(p => p.healthy));
    const unhealthyPeers = $derived(peers.filter(p => !p.healthy));
</script>

<div class="page">
    <div class="page-header">
        <h1 class="page-title">Network Nodes</h1>
        <button class="refresh-btn" onclick={load} disabled={loading} aria-label="Refresh">↻</button>
    </div>

    {#if error}
        <div class="error-banner">{error}</div>
    {/if}

    <!-- This node -->
    <section class="section">
        <div class="section-title">This Node</div>
        {#if loading && !identity}
            <div class="skeleton identity-skeleton"></div>
        {:else if identity}
            <div class="identity-card">
                <div class="identity-main">
                    <div class="node-name">{identity.name}</div>
                    <span class="type-badge type-{identity.type}">{typeLabel(identity.type)}</span>
                </div>
                <div class="identity-detail">
                    <span class="detail-label">Address</span>
                    <a class="detail-link" href={identity.address} target="_blank" rel="noopener noreferrer">{identity.address}</a>
                </div>
                <div class="identity-detail">
                    <span class="detail-label">Node ID</span>
                    <code class="detail-code">{identity.id}</code>
                </div>
                <div class="identity-detail">
                    <span class="detail-label">Public Key</span>
                    <code class="detail-code key-truncated">{identity.publicKey.slice(0, 32)}…</code>
                </div>
                <div class="identity-detail">
                    <span class="detail-label">Since</span>
                    <span>{formatDate(identity.createdAt)}</span>
                </div>
            </div>
        {/if}
    </section>

    <!-- Peers -->
    <section class="section">
        <div class="section-title">
            Known Peers
            {#if !loading}
                <span class="peer-count">{peers.length} total · {healthyPeers.length} healthy</span>
            {/if}
        </div>

        {#if loading && peers.length === 0}
            {#each [1, 2, 3] as _}
                <div class="skeleton peer-skeleton"></div>
            {/each}
        {:else if peers.length === 0}
            <div class="empty">No peers discovered yet. The node will find peers automatically via gossip.</div>
        {:else}
            {#if healthyPeers.length > 0}
                <div class="peer-group-label">Healthy</div>
                <ul class="peer-list">
                    {#each healthyPeers as peer (peer.id)}
                        <li class="peer-row">
                            <div class="peer-status healthy"></div>
                            <div class="peer-info">
                                <div class="peer-name">{peer.name}</div>
                                <div class="peer-meta">
                                    <span class="type-badge type-{peer.type}">{typeLabel(peer.type)}</span>
                                    <a class="peer-address" href={peer.address} target="_blank" rel="noopener noreferrer">{peer.address}</a>
                                </div>
                            </div>
                            <div class="peer-stats">
                                {#if peer.lastLatencyMs !== null}
                                    <span class="latency">{peer.lastLatencyMs}ms</span>
                                {/if}
                                <span class="last-seen">{relativeTime(peer.lastSeenAt)}</span>
                            </div>
                        </li>
                    {/each}
                </ul>
            {/if}

            {#if unhealthyPeers.length > 0}
                <div class="peer-group-label unhealthy-label">Degraded / Offline</div>
                <ul class="peer-list">
                    {#each unhealthyPeers as peer (peer.id)}
                        <li class="peer-row unhealthy">
                            <div class="peer-status unhealthy"></div>
                            <div class="peer-info">
                                <div class="peer-name">{peer.name}</div>
                                <div class="peer-meta">
                                    <span class="type-badge type-{peer.type}">{typeLabel(peer.type)}</span>
                                    <span class="peer-address muted">{peer.address}</span>
                                </div>
                            </div>
                            <div class="peer-stats">
                                <span class="failures">{peer.consecutiveFailures} fail{peer.consecutiveFailures === 1 ? "" : "s"}</span>
                                <span class="last-seen muted">{relativeTime(peer.lastSeenAt)}</span>
                            </div>
                        </li>
                    {/each}
                </ul>
            {/if}
        {/if}
    </section>
</div>

<style>
    .page {
        padding: 1.5rem 1.5rem 6rem;
        max-width: 640px;
        margin: 0 auto;
    }

    @media (min-width: 768px) {
        .page { padding-bottom: 2rem; }
    }

    /* ── Header ────────────────────────────────────────────────────────────── */

    .page-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 1.5rem;
    }

    .page-title {
        font-size: 1.35rem;
        font-weight: 700;
        color: #0f172a;
        margin: 0;
    }

    .refresh-btn {
        background: none;
        border: none;
        font-size: 1.25rem;
        cursor: pointer;
        color: #64748b;
        padding: 0.35rem;
        border-radius: 8px;
        font-family: inherit;
        line-height: 1;
        transition: background 0.1s;
    }
    .refresh-btn:hover:not(:disabled) { background: #f1f5f9; color: #0f172a; }
    .refresh-btn:disabled { opacity: 0.4; }

    /* ── Error ─────────────────────────────────────────────────────────────── */

    .error-banner {
        background: #fef2f2;
        border: 1px solid #fca5a5;
        border-radius: 10px;
        padding: 0.75rem 1rem;
        color: #b91c1c;
        font-size: 0.875rem;
        margin-bottom: 1.25rem;
    }

    /* ── Section ───────────────────────────────────────────────────────────── */

    .section {
        margin-bottom: 2rem;
    }

    .section-title {
        font-size: 0.78rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.07em;
        color: #64748b;
        margin-bottom: 0.75rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .peer-count {
        font-weight: 400;
        font-size: 0.78rem;
        color: #94a3b8;
        text-transform: none;
        letter-spacing: 0;
    }

    /* ── Skeletons ─────────────────────────────────────────────────────────── */

    .skeleton {
        background: linear-gradient(90deg, #e2e8f0 25%, #cbd5e1 50%, #e2e8f0 75%);
        background-size: 200% 100%;
        border-radius: 12px;
        animation: shimmer 1.3s infinite;
    }

    @keyframes shimmer {
        0%   { background-position: 200% 0; }
        100% { background-position: -200% 0; }
    }

    .identity-skeleton { height: 8rem; margin-bottom: 0.75rem; }
    .peer-skeleton     { height: 3.5rem; margin-bottom: 0.5rem; }

    /* ── Identity card ─────────────────────────────────────────────────────── */

    .identity-card {
        background: #fff;
        border: 1.5px solid #e2e8f0;
        border-radius: 14px;
        padding: 1.25rem 1.5rem;
        display: flex;
        flex-direction: column;
        gap: 0.6rem;
    }

    .identity-main {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        margin-bottom: 0.25rem;
    }

    .node-name {
        font-size: 1.1rem;
        font-weight: 700;
        color: #0f172a;
    }

    .identity-detail {
        display: flex;
        align-items: baseline;
        gap: 0.6rem;
        font-size: 0.85rem;
        color: #374151;
        flex-wrap: wrap;
    }

    .detail-label {
        font-size: 0.75rem;
        font-weight: 600;
        color: #94a3b8;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        width: 6rem;
        flex-shrink: 0;
    }

    .detail-link {
        color: #2563eb;
        text-decoration: none;
        word-break: break-all;
    }
    .detail-link:hover { text-decoration: underline; }

    .detail-code {
        font-family: "SF Mono", "Fira Code", monospace;
        font-size: 0.78rem;
        color: #374151;
        word-break: break-all;
    }

    .key-truncated { color: #94a3b8; }

    /* ── Type badge ────────────────────────────────────────────────────────── */

    .type-badge {
        display: inline-block;
        font-size: 0.68rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        border-radius: 6px;
        padding: 0.15rem 0.5rem;
        flex-shrink: 0;
    }

    .type-community     { background: #dcfce7; color: #15803d; }
    .type-infrastructure{ background: #eff6ff; color: #1d4ed8; }
    .type-federation    { background: #fef9c3; color: #b45309; }
    .type-forum         { background: #f3e8ff; color: #7e22ce; }

    /* ── Peer list ─────────────────────────────────────────────────────────── */

    .peer-group-label {
        font-size: 0.72rem;
        font-weight: 600;
        color: #16a34a;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-bottom: 0.4rem;
        margin-top: 0.75rem;
    }
    .peer-group-label:first-of-type { margin-top: 0; }
    .unhealthy-label { color: #dc2626; }

    .peer-list {
        list-style: none;
        padding: 0;
        margin: 0 0 0.25rem;
        display: flex;
        flex-direction: column;
        gap: 0.375rem;
    }

    .peer-row {
        background: #fff;
        border: 1.5px solid #e2e8f0;
        border-radius: 12px;
        padding: 0.75rem 1rem;
        display: flex;
        align-items: center;
        gap: 0.75rem;
    }
    .peer-row.unhealthy { background: #fafafa; border-color: #fecaca; }

    .peer-status {
        width: 0.55rem;
        height: 0.55rem;
        border-radius: 50%;
        flex-shrink: 0;
    }
    .peer-status.healthy   { background: #22c55e; box-shadow: 0 0 0 3px #dcfce7; }
    .peer-status.unhealthy { background: #ef4444; box-shadow: 0 0 0 3px #fee2e2; }

    .peer-info {
        flex: 1;
        min-width: 0;
    }

    .peer-name {
        font-size: 0.9rem;
        font-weight: 600;
        color: #0f172a;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .peer-meta {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        flex-wrap: wrap;
        margin-top: 0.2rem;
    }

    .peer-address {
        font-size: 0.78rem;
        color: #2563eb;
        text-decoration: none;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 18rem;
    }
    .peer-address:hover { text-decoration: underline; }
    .peer-address.muted { color: #94a3b8; }

    .peer-stats {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 0.2rem;
        flex-shrink: 0;
    }

    .latency {
        font-size: 0.8rem;
        font-weight: 600;
        color: #16a34a;
        font-variant-numeric: tabular-nums;
    }

    .failures {
        font-size: 0.78rem;
        font-weight: 600;
        color: #ef4444;
    }

    .last-seen {
        font-size: 0.75rem;
        color: #64748b;
    }
    .last-seen.muted { color: #cbd5e1; }

    .empty {
        text-align: center;
        color: #94a3b8;
        font-size: 0.875rem;
        padding: 2.5rem 0;
    }

    .muted { color: #94a3b8; }
</style>
