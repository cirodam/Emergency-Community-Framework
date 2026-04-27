<script lang="ts">
    import { getStall, type StallDto } from "../lib/api.js";
    import { selectedStallId, currentPage } from "../lib/nav.js";

    let stall   = $state<StallDto | null>(null);
    let loading = $state(true);
    let error   = $state("");

    const id = $derived($selectedStallId);

    async function load() {
        if (!id) { error = "No stall selected"; loading = false; return; }
        loading = true;
        error   = "";
        try {
            stall = await getStall(id);
        } catch {
            error = "Failed to load stall";
        } finally {
            loading = false;
        }
    }

    $effect(() => { load(); });
</script>

<div class="page">
    <button class="back-btn" onclick={() => currentPage.set("stalls")}>← Back to Stalls</button>

    {#if loading}
        <div class="skeleton-block"></div>
    {:else if error}
        <p class="error">{error}</p>
    {:else if stall}
        <div class="card">
            <div class="stall-meta-row">
                <span class="badge category-badge">{stall.category}</span>
                {#if stall.stallNumber}<span class="badge stall-num">#{stall.stallNumber}</span>{/if}
                <span class="badge status-badge {stall.status}">{stall.status}</span>
            </div>
            <h2 class="stall-name">{stall.name}</h2>
            <p class="meta-line">
                <strong>Market:</strong> {stall.marketplaceName}
            </p>
            <p class="meta-line">
                <strong>Holder:</strong> {stall.holderHandle || stall.holderId}
            </p>
            {#if stall.description}
                <p class="stall-desc">{stall.description}</p>
            {/if}
            <p class="created-at">Listed {new Date(stall.createdAt).toLocaleDateString()}</p>
        </div>
    {/if}
</div>

<style>
.page { padding: 1rem; max-width: 600px; margin: 0 auto; }
.back-btn { background: none; border: none; cursor: pointer; color: #555; font-size: 0.9rem; margin-bottom: 1rem; padding: 0; }
.back-btn:hover { color: #000; }
.card { background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; padding: 1.25rem; }
.stall-meta-row { display: flex; gap: 0.5rem; margin-bottom: 0.75rem; }
.stall-name { margin: 0 0 0.75rem; font-size: 1.4rem; }
.meta-line { margin: 0.3rem 0; font-size: 0.95rem; color: #444; }
.stall-desc { margin-top: 0.75rem; color: #555; line-height: 1.5; }
.created-at { margin-top: 1rem; font-size: 0.8rem; color: #aaa; }
.badge { display: inline-block; padding: 0.2rem 0.6rem; border-radius: 999px; font-size: 0.75rem; font-weight: 600; }
.category-badge { background: #e8f0fe; color: #1a56db; }
.stall-num { background: #f5f5f5; color: #333; border: 1px solid #ddd; }
.status-badge.active   { background: #e8f5e9; color: #2e7d32; }
.status-badge.inactive { background: #fce4ec; color: #880e4f; }
.skeleton-block { height: 200px; background: #eee; border-radius: 8px; animation: pulse 1.4s ease-in-out infinite; }
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
.error { color: #c62828; }
</style>
