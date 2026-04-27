<script lang="ts">
    import { listPools, createPool, listDomains, listPersons } from "../lib/api.js";
    import type { PoolDto, DomainDto, PersonDto } from "../lib/api.js";

    // ── State ──────────────────────────────────────────────────────────────────
    let pools: PoolDto[]      = $state([]);
    let domains: DomainDto[]  = $state([]);
    let persons: PersonDto[]  = $state([]);
    let loading  = $state(true);
    let error    = $state("");

    // New pool form
    let showNewPool   = $state(false);
    let newPoolName   = $state("");
    let newPoolDesc   = $state("");
    let creating      = $state(false);
    let createError   = $state("");

    // Expanded pool detail
    let expandedPoolId: string | null = $state(null);

    async function load() {
        loading = true;
        error = "";
        try {
            [pools, domains, persons] = await Promise.all([listPools(), listDomains(), listPersons()]);
        } catch (e) {
            error = e instanceof Error ? e.message : "Failed to load governance data";
        } finally {
            loading = false;
        }
    }

    $effect(() => { load(); });

    function domainName(id: string): string {
        return domains.find(d => d.id === id)?.name ?? id;
    }

    function governedDomains(poolId: string): DomainDto[] {
        return domains.filter(d => d.poolId === poolId);
    }

    function personName(personId: string): string {
        const p = persons.find(p => p.id === personId);
        return p ? `${p.firstName} ${p.lastName}` : personId;
    }

    function togglePool(id: string) {
        expandedPoolId = expandedPoolId === id ? null : id;
    }

    async function submitNewPool() {
        if (!newPoolName.trim()) return;
        creating = true;
        createError = "";
        try {
            const pool = await createPool(newPoolName.trim(), newPoolDesc.trim());
            pools = [...pools, pool];
            showNewPool = false;
            newPoolName = "";
            newPoolDesc = "";
        } catch (e) {
            createError = e instanceof Error ? e.message : "Failed to create pool";
        } finally {
            creating = false;
        }
    }
</script>

<div class="gov-page">
    <!-- ── Leadership Pools ─────────────────────────────────────────────── -->
    <section class="section">
        <div class="section-header">
            <div>
                <h2 class="section-title">Leadership Pools</h2>
                <p class="section-subtitle">Named groups of members who govern a functional domain.</p>
            </div>
            <button class="btn-add" onclick={() => { showNewPool = !showNewPool; createError = ""; }}>
                {showNewPool ? "Cancel" : "+ New pool"}
            </button>
        </div>

        {#if showNewPool}
            <form class="new-pool-form" onsubmit={(e) => { e.preventDefault(); submitNewPool(); }}>
                <input
                    class="input"
                    type="text"
                    placeholder="Pool name (e.g. Healthcare Council)"
                    bind:value={newPoolName}
                    required
                />
                <input
                    class="input"
                    type="text"
                    placeholder="Description (optional)"
                    bind:value={newPoolDesc}
                />
                {#if createError}
                    <p class="form-error">{createError}</p>
                {/if}
                <button class="btn-primary" type="submit" disabled={creating || !newPoolName.trim()}>
                    {creating ? "Creating…" : "Create pool"}
                </button>
            </form>
        {/if}

        {#if loading}
            <div class="skeleton"></div>
            <div class="skeleton short"></div>
            <div class="skeleton"></div>
        {:else if error}
            <p class="error-msg">{error}</p>
        {:else if pools.length === 0}
            <p class="empty-msg">No leadership pools yet. Create one to start organising governance.</p>
        {:else}
            <div class="pool-list">
                {#each pools as pool (pool.id)}
                    {@const governed = governedDomains(pool.id)}
                    <div class="pool-card" class:expanded={expandedPoolId === pool.id}>
                        <button class="pool-header" onclick={() => togglePool(pool.id)}>
                            <div class="pool-info">
                                <span class="pool-name">{pool.name}</span>
                                {#if pool.description}
                                    <span class="pool-desc">{pool.description}</span>
                                {/if}
                            </div>
                            <div class="pool-meta">
                                <span class="pool-stat">{pool.personIds.length} member{pool.personIds.length !== 1 ? "s" : ""}</span>
                                {#if governed.length > 0}
                                    <span class="pool-stat governed">{governed.length} domain{governed.length !== 1 ? "s" : ""}</span>
                                {/if}
                                <span class="chevron" class:flipped={expandedPoolId === pool.id}>›</span>
                            </div>
                        </button>

                        {#if expandedPoolId === pool.id}
                            <div class="pool-detail">
                                {#if governed.length > 0}
                                    <div class="detail-section">
                                        <span class="detail-label">Governing</span>
                                        <div class="tag-list">
                                            {#each governed as d (d.id)}
                                                <span class="tag tag-domain">{d.name}</span>
                                            {/each}
                                        </div>
                                    </div>
                                {/if}

                                <div class="detail-section">
                                    <span class="detail-label">Members</span>
                                    {#if pool.personIds.length === 0}
                                        <p class="detail-empty">No members yet.</p>
                                    {:else}
                                        <div class="member-list">
                                            {#each pool.personIds as pid (pid)}
                                                <span class="tag tag-person">{personName(pid)}</span>
                                            {/each}
                                        </div>
                                    {/if}
                                </div>
                            </div>
                        {/if}
                    </div>
                {/each}
            </div>
        {/if}
    </section>

    <!-- ── Referenda ───────────────────────────────────────────────────── -->
    <section class="section">
        <div class="section-header">
            <div>
                <h2 class="section-title">Referenda</h2>
                <p class="section-subtitle">Community-wide votes on constitutional amendments and major decisions.</p>
            </div>
        </div>
        <div class="placeholder-card">
            <span class="placeholder-icon">§</span>
            <p class="placeholder-text">No active referenda.</p>
            <p class="placeholder-sub">Constitutional amendments and major decisions will appear here for community vote.</p>
        </div>
    </section>

    <!-- ── Proposals ──────────────────────────────────────────────────── -->
    <section class="section">
        <div class="section-header">
            <div>
                <h2 class="section-title">Council Proposals</h2>
                <p class="section-subtitle">Items under review by the governing council.</p>
            </div>
        </div>
        <div class="placeholder-card">
            <span class="placeholder-icon">⊛</span>
            <p class="placeholder-text">No active proposals.</p>
            <p class="placeholder-sub">Proposals from leadership pools and domain councils will appear here.</p>
        </div>
    </section>
</div>

<style>
    .gov-page {
        padding: 1.5rem 1.5rem 6rem;
        max-width: 640px;
        margin: 0 auto;
        display: flex;
        flex-direction: column;
        gap: 2.5rem;
    }

    @media (min-width: 768px) {
        .gov-page { padding-bottom: 2rem; max-width: 860px; }
    }

    /* ── Sections ──────────────────────────────────────────────────────── */
    .section { display: flex; flex-direction: column; gap: 1rem; }

    .section-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 1rem;
    }

    .section-title {
        font-size: 1.15rem;
        font-weight: 700;
        color: #0f172a;
        margin: 0 0 0.2rem;
    }

    .section-subtitle {
        font-size: 0.8rem;
        color: #64748b;
        margin: 0;
    }

    /* ── New pool form ─────────────────────────────────────────────────── */
    .new-pool-form {
        display: flex;
        flex-direction: column;
        gap: 0.6rem;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 0.75rem;
        padding: 1rem;
    }

    .input {
        padding: 0.6rem 0.75rem;
        border: 1px solid #e2e8f0;
        border-radius: 0.5rem;
        font-size: 0.9rem;
        outline: none;
        background: #fff;
    }

    .input:focus { border-color: #16a34a; box-shadow: 0 0 0 2px #dcfce7; }

    .form-error { font-size: 0.8rem; color: #dc2626; margin: 0; }

    .btn-primary {
        padding: 0.6rem 1.1rem;
        background: #16a34a;
        color: #fff;
        border: none;
        border-radius: 0.5rem;
        font-size: 0.875rem;
        font-weight: 600;
        cursor: pointer;
        align-self: flex-start;
    }

    .btn-primary:disabled { opacity: 0.55; cursor: not-allowed; }

    .btn-add {
        padding: 0.4rem 0.9rem;
        background: none;
        border: 1px solid #16a34a;
        border-radius: 0.5rem;
        color: #16a34a;
        font-size: 0.8rem;
        font-weight: 600;
        cursor: pointer;
        white-space: nowrap;
        flex-shrink: 0;
    }

    /* ── Pool cards ────────────────────────────────────────────────────── */
    .pool-list {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .pool-card {
        border: 1px solid #e2e8f0;
        border-radius: 0.75rem;
        overflow: hidden;
        background: #fff;
    }

    .pool-card.expanded { border-color: #86efac; }

    .pool-header {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        padding: 0.9rem 1.1rem;
        background: none;
        border: none;
        cursor: pointer;
        text-align: left;
        color: inherit;
    }

    .pool-info { display: flex; flex-direction: column; gap: 0.15rem; min-width: 0; }

    .pool-name { font-size: 0.95rem; font-weight: 600; color: #0f172a; }

    .pool-desc {
        font-size: 0.78rem;
        color: #64748b;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 30ch;
    }

    .pool-meta { display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0; }

    .pool-stat { font-size: 0.72rem; color: #94a3b8; }
    .pool-stat.governed { color: #16a34a; font-weight: 600; }

    .chevron { font-size: 1.2rem; color: #94a3b8; transition: transform 0.15s; display: inline-block; }
    .chevron.flipped { transform: rotate(90deg); }

    /* ── Pool detail ───────────────────────────────────────────────────── */
    .pool-detail {
        padding: 0 1.1rem 1rem;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        border-top: 1px solid #f1f5f9;
    }

    .detail-section { display: flex; flex-direction: column; gap: 0.4rem; }

    .detail-label {
        font-size: 0.7rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.07em;
        color: #94a3b8;
    }

    .detail-empty { font-size: 0.82rem; color: #94a3b8; margin: 0; }

    .tag-list, .member-list { display: flex; flex-wrap: wrap; gap: 0.4rem; }

    .tag {
        font-size: 0.75rem;
        font-weight: 500;
        padding: 0.2rem 0.6rem;
        border-radius: 9999px;
    }

    .tag-domain { background: #dcfce7; color: #15803d; }
    .tag-person { background: #e0f2fe; color: #0369a1; }

    /* ── Placeholder cards ─────────────────────────────────────────────── */
    .placeholder-card {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.4rem;
        padding: 2rem 1.5rem;
        background: #f8fafc;
        border: 1px dashed #cbd5e1;
        border-radius: 0.75rem;
        text-align: center;
    }

    .placeholder-icon { font-size: 1.75rem; color: #94a3b8; }
    .placeholder-text { font-size: 0.9rem; font-weight: 600; color: #475569; margin: 0; }
    .placeholder-sub  { font-size: 0.8rem; color: #94a3b8; margin: 0; max-width: 36ch; }

    /* ── Utility ───────────────────────────────────────────────────────── */
    .skeleton {
        height: 3.5rem;
        background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
        background-size: 200% 100%;
        animation: shimmer 1.3s infinite;
        border-radius: 0.75rem;
    }

    .skeleton.short { height: 2.5rem; width: 60%; }

    @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

    .error-msg { font-size: 0.875rem; color: #dc2626; padding: 0.75rem 1rem; background: #fef2f2; border-radius: 0.5rem; }
    .empty-msg { font-size: 0.875rem; color: #64748b; }
</style>
