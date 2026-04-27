<script lang="ts">
    import { getMarketplace } from "../lib/api.js";
    import type { MarketplaceDto } from "../lib/api.js";
    import { currentPage, selectedMarketplaceId } from "../lib/nav.js";

    let marketplace = $state<MarketplaceDto | null>(null);
    let loading     = $state(true);
    let error       = $state("");

    $effect(() => {
        const id = $selectedMarketplaceId;
        if (!id) { currentPage.set("marketplaces"); return; }
        loading = true; error = "";
        getMarketplace(id)
            .then(m => { marketplace = m; })
            .catch(e => { error = e instanceof Error ? e.message : "Failed to load"; })
            .finally(() => { loading = false; });
    });
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
            <p class="section-hint">
                Listings scoped to individual marketplaces are coming soon.<br />
                In the meantime, browse all listings from the Listings tab.
            </p>
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

    .section { margin-top: 1rem; }
    .section-hint {
        font-size: 0.85rem; color: #94a3b8;
        background: #f8fafc; border: 1px solid #e2e8f0;
        border-radius: 0.75rem; padding: 1rem 1.1rem;
        line-height: 1.6; margin: 0;
    }

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
