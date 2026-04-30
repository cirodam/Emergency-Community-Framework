<script lang="ts">
    import { listPools, createPool } from "../lib/api.js";
    import type { PoolDto } from "../lib/api.js";
    import { currentPage, selectedPoolId, session } from "../lib/session.js";

    let pools: PoolDto[] = $state([]);
    let loading = $state(true);
    let error   = $state("");

    let creating    = $state(false);
    let newName     = $state("");
    let newDesc     = $state("");
    let createError = $state("");
    let saving      = $state(false);

    async function submitCreate() {
        if (!newName.trim()) { createError = "Pool name is required."; return; }
        saving = true;
        createError = "";
        try {
            const pool = await createPool(newName.trim(), newDesc.trim());
            pools = [...pools, pool];
            newName = "";
            newDesc = "";
            creating = false;
        } catch (e) {
            createError = e instanceof Error ? e.message : "Failed to create pool";
        } finally {
            saving = false;
        }
    }

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

    <!-- ── Referenda ──────────────────────────────────────────────────────── -->
    <button class="nav-card" onclick={() => currentPage.go("proposals")}>
        <div class="card-icon">🗳</div>
        <div class="card-body">
            <span class="card-title">Referenda</span>
            <span class="card-sub">Proposals open to the full membership</span>
        </div>
        <span class="card-arrow">›</span>
    </button>

    <!-- ── Assembly ───────────────────────────────────────────────────────── -->
    <button class="nav-card" onclick={() => currentPage.go("assembly")}>
        <div class="card-icon">⊚</div>
        <div class="card-body">
            <span class="card-title">The Assembly</span>
            <span class="card-sub">Members drawn by sortition to govern this term</span>
        </div>
        <span class="card-arrow">›</span>
    </button>

    <!-- ── Leader Pools ───────────────────────────────────────────────────── -->
    <div class="pools-header">
        <span class="pools-label">Leader Pools</span>
        {#if $session?.isSteward}
            <button class="add-pool-btn" onclick={() => { creating = !creating; createError = ""; }}>＋ New pool</button>
        {/if}
    </div>

    {#if creating}
        <div class="create-form">
            <input class="create-input" placeholder="Pool name" bind:value={newName} />
            <input class="create-input" placeholder="Description (optional)" bind:value={newDesc} />
            {#if createError}<p class="create-error">{createError}</p>{/if}
            <div class="create-actions">
                <button class="btn-save" onclick={submitCreate} disabled={saving}>{saving ? "Saving…" : "Create"}</button>
                <button class="btn-cancel" onclick={() => { creating = false; createError = ""; }}>Cancel</button>
            </div>
        </div>
    {/if}

    {#if loading}
        <div class="skeleton"></div>
        <div class="skeleton"></div>
    {:else if error}
        <p class="error-msg">{error}</p>
    {:else if pools.length === 0}
        <p class="empty-msg">No leader pools yet.</p>
    {:else}
        {#each pools as pool (pool.id)}
            <button class="nav-card" onclick={() => openPool(pool)}>
                <div class="card-icon pool-icon">⬡</div>
                <div class="card-body">
                    <span class="card-title">{pool.name}</span>
                    <span class="card-sub">
                        {pool.personIds.length} member{pool.personIds.length !== 1 ? "s" : ""}
                        {#if pool.description} · {pool.description}{/if}
                    </span>
                </div>
                <span class="card-arrow">›</span>
            </button>
        {/each}
    {/if}
</div>

<style>
    .page {
        padding: 1.5rem 1.5rem 6rem;
        max-width: 640px;
        margin: 0 auto;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    @media (min-width: 768px) {
        .page { padding-bottom: 2rem; }
    }

    .page-title {
        font-size: 1.3rem;
        font-weight: 700;
        color: #0f172a;
        margin: 0 0 0.5rem;
    }

    /* ── Nav cards ───────────────────────────────────────────────────────── */
    .nav-card {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 1rem 1.1rem;
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 0.75rem;
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

    /* ── Pools section label ─────────────────────────────────────────────── */
    .pools-header {
        margin-top: 0.5rem;
        padding: 0 0.25rem;
        display: flex;
        align-items: center;
        justify-content: space-between;
    }

    .pools-label {
        font-size: 0.7rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.07em;
        color: #94a3b8;
    }

    .add-pool-btn {
        background: transparent;
        border: 1px dashed #86efac;
        border-radius: 6px;
        color: #15803d;
        font-size: 0.75rem;
        padding: 0.2rem 0.6rem;
        cursor: pointer;
    }
    .add-pool-btn:hover { background: #f0fdf4; }

    .create-form {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 0.75rem;
        padding: 1rem;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .create-input {
        border: 1px solid #d1d5db;
        border-radius: 6px;
        padding: 0.45rem 0.6rem;
        font-size: 0.875rem;
        font-family: inherit;
        background: #fff;
        color: #111827;
        width: 100%;
        box-sizing: border-box;
    }
    .create-input:focus { outline: 2px solid #86efac; }

    .create-error { font-size: 0.8rem; color: #dc2626; margin: 0; }

    .create-actions { display: flex; gap: 0.5rem; }

    .btn-save {
        background: #15803d;
        color: #fff;
        border: none;
        border-radius: 6px;
        padding: 0.4rem 1rem;
        font-size: 0.85rem;
        cursor: pointer;
    }
    .btn-save:disabled { opacity: 0.6; cursor: not-allowed; }
    .btn-save:hover:not(:disabled) { background: #166534; }

    .btn-cancel {
        background: transparent;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        padding: 0.4rem 0.8rem;
        font-size: 0.85rem;
        cursor: pointer;
        color: #374151;
    }
    .btn-cancel:hover { background: #f1f5f9; }

    /* ── Utility ─────────────────────────────────────────────────────────── */
    .skeleton {
        height: 4rem;
        background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
        background-size: 200% 100%;
        animation: shimmer 1.3s infinite;
        border-radius: 0.75rem;
    }

    @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

    .error-msg { font-size: 0.875rem; color: #dc2626; padding: 0.75rem 1rem; background: #fef2f2; border-radius: 0.5rem; margin: 0; }
    .empty-msg { font-size: 0.875rem; color: #64748b; margin: 0; }
</style>
