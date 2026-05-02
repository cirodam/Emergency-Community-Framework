<script lang="ts">
    import { getMarketplace, listStalls } from "../lib/api.js";
    import type { MarketplaceDto, StallDto } from "../lib/api.js";
    import { currentPage, selectedMarketplaceId, selectedStallId } from "../lib/nav.js";

    let marketplace = $state<MarketplaceDto | null>(null);
    let stalls      = $state<StallDto[]>([]);
    let loading     = $state(true);
    let error       = $state("");

    $effect(() => {
        const id = $selectedMarketplaceId;
        if (!id) { currentPage.set("marketplaces"); return; }
        loading = true; error = "";
        Promise.all([getMarketplace(id), listStalls(id)])
            .then(([m, s]) => { marketplace = m; stalls = s; })
            .catch(e => { error = e instanceof Error ? e.message : "Failed to load"; })
            .finally(() => { loading = false; });
    });

    function openStall(id: string) {
        selectedStallId.set(id);
        currentPage.set("stall");
    }
</script>

<div class="page">
    <button class="back-btn" onclick={() => currentPage.set("marketplaces")}>‹ Marketplaces</button>

    {#if loading}
        <div class="skeleton header-skel"></div>
        <div class="skeleton short"></div>
    {:else if error}
        <p class="error-msg">{error}</p>
    {:else if marketplace}
        <div class="mp-header">
            <h2 class="mp-name">{marketplace.name}</h2>
            <span class="mp-loc">📍 {marketplace.locationName}</span>
            {#if marketplace.description}
                <p class="mp-desc">{marketplace.description}</p>
            {/if}
        </div>

        <div class="section">
            <h3 class="section-title">Stalls</h3>
            {#if stalls.length === 0}
                <p class="empty">No stalls registered at this market yet.</p>
            {:else}
                <div class="stall-list">
                    {#each stalls as s (s.id)}
                        <button class="stall-card" onclick={() => openStall(s.id)}>
                            <div class="stall-card-header">
                                <span class="badge cat-badge">{s.category}</span>
                                {#if s.stallNumber}<span class="badge num-badge">#{s.stallNumber}</span>{/if}
                                {#if s.status === "inactive"}<span class="badge inactive-badge">Inactive</span>{/if}
                            </div>
                            <p class="stall-name">{s.name}</p>
                            {#if s.description}<p class="stall-desc">{s.description}</p>{/if}
                            <p class="stall-holder">{s.holderHandle}</p>
                        </button>
                    {/each}
                </div>
            {/if}
        </div>
    {/if}
</div>

<style>
    .page {
        padding: 1.5rem 1.5rem 6rem;
        max-width: 620px;
        margin: 0 auto;
    }

    .back-btn {
        font-size: 0.82rem; font-weight: 500; color: #64748b;
        background: none; border: none; padding: 0; cursor: pointer;
        margin-bottom: 1.25rem; display: block;
    }
    .back-btn:hover { color: #0f172a; }

    .mp-header { margin-bottom: 1.5rem; }
    .mp-name { font-size: 1.4rem; font-weight: 700; color: #0f172a; margin: 0 0 0.3rem; }
    .mp-loc  { font-size: 0.9rem; color: #64748b; }
    .mp-desc { font-size: 0.875rem; color: #475569; margin: 0.5rem 0 0; line-height: 1.5; }

    .section { margin-top: 1.5rem; }
    .section-title { font-size: 1rem; font-weight: 600; color: #0f172a; margin: 0 0 0.75rem; }
    .empty { font-size: 0.875rem; color: #94a3b8; }

    .stall-list { display: flex; flex-direction: column; gap: 0.6rem; }
    .stall-card {
        display: block; width: 100%; text-align: left;
        background: #fff; border: 1px solid #e2e8f0; border-radius: 0.75rem;
        padding: 0.85rem 1rem; cursor: pointer;
        transition: border-color 0.15s, box-shadow 0.15s;
    }
    .stall-card:hover { border-color: #94a3b8; box-shadow: 0 1px 4px rgba(0,0,0,0.07); }
    .stall-card-header { display: flex; gap: 0.4rem; margin-bottom: 0.35rem; }
    .stall-name { margin: 0 0 0.2rem; font-size: 0.95rem; font-weight: 600; color: #0f172a; }
    .stall-desc { margin: 0 0 0.2rem; font-size: 0.82rem; color: #64748b; }
    .stall-holder { margin: 0; font-size: 0.78rem; color: #94a3b8; }

    .badge { display: inline-block; padding: 0.15rem 0.5rem; border-radius: 999px; font-size: 0.72rem; font-weight: 600; }
    .cat-badge { background: #e8f0fe; color: #1a56db; }
    .num-badge { background: #f5f5f5; color: #333; border: 1px solid #ddd; }
    .inactive-badge { background: #fce4ec; color: #880e4f; }

    .error-msg { font-size: 0.875rem; color: #ef4444; }

    .skeleton {
        height: 3rem; border-radius: 0.75rem; margin-bottom: 0.75rem;
        background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
        background-size: 200% 100%;
        animation: shimmer 1.2s infinite;
    }
    .skeleton.header-skel { height: 2.5rem; width: 50%; }
    .skeleton.short { height: 1.5rem; width: 35%; }
    @keyframes shimmer {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
    }
</style>
