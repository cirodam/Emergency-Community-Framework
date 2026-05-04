<script lang="ts">
    import { listPools } from "../lib/api.js";
    import type { PoolDto } from "../lib/api.js";
    import { currentPage, selectedPoolId } from "../lib/session.js";

    let pools: PoolDto[] = $state([]);
    let loading = $state(true);
    let error   = $state("");

    async function load() {
        loading = true;
        error = "";
        try {
            pools = await listPools();
        } catch (e) {
            error = e instanceof Error ? e.message : "Failed to load leadership data";
        } finally {
            loading = false;
        }
    }

    $effect(() => { load(); });

    function openPool(pool: PoolDto) {
        selectedPoolId.set(pool.id);
        currentPage.go("pool");
    }
</script>

<div class="page">
    <h1 class="page-title">Leadership</h1>

    <!-- ── Tier 1: The Community ─────────────────────────────────────────── -->
    <div class="tier">
        <div class="tier-header">
            <span class="tier-label">The Community</span>
            <span class="tier-desc">All authority originates here</span>
        </div>
        <button class="nav-card" onclick={() => currentPage.go("proposals")}>
            <div class="card-icon">🗳</div>
            <div class="card-body">
                <span class="card-title">Referenda</span>
                <span class="card-sub">Proposals put to the full membership for a direct vote</span>
            </div>
            <span class="card-arrow">›</span>
        </button>
    </div>

    <div class="flow-arrow">↓</div>

    <!-- ── Tier 2: The Community Assembly ────────────────────────────────── -->
    <div class="tier">
        <div class="tier-header">
            <span class="tier-label">The Community Assembly</span>
            <span class="tier-desc">Governing authority delegated by the membership</span>
        </div>
        <button class="nav-card" onclick={() => currentPage.go("assembly")}>
            <div class="card-icon">⊚</div>
            <div class="card-body">
                <span class="card-title">Community Assembly</span>
                <span class="card-sub">Members drawn by sortition to govern this term</span>
            </div>
            <span class="card-arrow">›</span>
        </button>
    </div>

    <div class="flow-arrow">↓</div>

    <!-- ── Tier 3: Leader Pools ───────────────────────────────────────────── -->
    <div class="tier">
        <div class="tier-header">
            <span class="tier-label">Leader Pools</span>
            <span class="tier-desc">Delegated authority for specific areas of community life</span>
        </div>

        {#if loading}
            <div class="skeleton"></div>
            <div class="skeleton"></div>
        {:else if error}
            <p class="error-msg">{error}</p>
        {:else if pools.length === 0}
            <p class="empty-msg">No leader pools have been established yet.</p>
        {:else}
            {#each pools as pool (pool.id)}
                <button class="nav-card" onclick={() => openPool(pool)}>
                    <div class="card-icon pool-icon">⬡</div>
                    <div class="card-body">
                        <span class="card-title">{pool.name}</span>
                        <span class="card-sub">
                            {pool.personHandles.length} member{pool.personHandles.length !== 1 ? "s" : ""}
                            {#if pool.description} · {pool.description}{/if}
                        </span>
                    </div>
                    <span class="card-arrow">›</span>
                </button>
            {/each}
        {/if}
    </div>
</div>

<style>
    .page {
        padding: 1.5rem 1.5rem 6rem;
        max-width: 640px;
        margin: 0 auto;
        display: flex;
        flex-direction: column;
        gap: 0;
    }

    @media (min-width: 768px) {
        .page { padding-bottom: 2rem; }
    }

    .page-title {
        font-size: 1.3rem;
        font-weight: 700;
        color: #0f172a;
        margin: 0 0 1.25rem;
    }

    /* ── Tiers ───────────────────────────────────────────────────────────── */
    .tier {
        border: 1px solid #e2e8f0;
        border-radius: 0.75rem;
        padding: 1rem 1rem 0.75rem;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        background: #fff;
    }

    .tier-header {
        display: flex;
        align-items: baseline;
        gap: 0.6rem;
        margin-bottom: 0.25rem;
        padding-bottom: 0.6rem;
        border-bottom: 1px solid #f1f5f9;
    }

    .tier-label {
        font-size: 0.72rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: #94a3b8;
    }

    .tier-desc {
        font-size: 0.78rem;
        color: #cbd5e1;
    }

    .flow-arrow {
        text-align: center;
        font-size: 1rem;
        color: #cbd5e1;
        padding: 0.35rem 0;
        line-height: 1;
    }

    /* ── Nav cards ───────────────────────────────────────────────────────── */
    .nav-card {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 0.75rem 0.75rem;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 0.6rem;
        cursor: pointer;
        text-align: left;
        color: inherit;
        width: 100%;
        transition: border-color 0.15s, box-shadow 0.15s;
    }

    .nav-card:hover {
        border-color: #86efac;
        box-shadow: 0 2px 8px #dcfce7;
    }

    .card-icon {
        font-size: 1.4rem;
        flex-shrink: 0;
        width: 2rem;
        text-align: center;
    }

    .pool-icon { color: #15803d; }

    .card-body {
        display: flex;
        flex-direction: column;
        gap: 0.15rem;
        flex: 1;
        min-width: 0;
    }

    .card-title {
        font-size: 0.95rem;
        font-weight: 600;
        color: #0f172a;
    }

    .card-sub {
        font-size: 0.78rem;
        color: #64748b;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .card-arrow {
        font-size: 1.3rem;
        color: #94a3b8;
        flex-shrink: 0;
    }

    /* ── Utility ─────────────────────────────────────────────────────────── */
    .skeleton {
        height: 4rem;
        background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
        background-size: 200% 100%;
        animation: shimmer 1.3s infinite;
        border-radius: 0.6rem;
    }

    @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

    .error-msg { font-size: 0.875rem; color: #dc2626; padding: 0.75rem 1rem; background: #fef2f2; border-radius: 0.5rem; margin: 0; }
    .empty-msg { font-size: 0.875rem; color: #64748b; margin: 0; padding: 0.25rem 0; }
</style>
