<script lang="ts">
    import type { Listing, ListingType } from "../lib/api.js";
    import {
        getListings,
        createListing,
        cancelListing,
        purchaseListing,
    } from "../lib/api.js";
    import { session } from "../lib/session.js";
    import ListingCard from "../components/ListingCard.svelte";
    import AppSwitcher from "../components/AppSwitcher.svelte";

    let listings     = $state<Listing[]>([]);
    let filterType   = $state<ListingType | "all">("all");
    let loading      = $state(true);
    let error        = $state("");
    let showForm     = $state(false);

    // New listing form fields
    let newType        = $state<ListingType>("item");
    let newTitle       = $state("");
    let newDescription = $state("");
    let newPrice       = $state(0);
    let submitting     = $state(false);
    let formError      = $state("");

    async function loadListings() {
        loading = true;
        error   = "";
        try {
            listings = await getListings(filterType === "all" ? undefined : filterType);
        } catch (e) {
            error = e instanceof Error ? e.message : "Failed to load listings";
        } finally {
            loading = false;
        }
    }

    $effect(() => { loadListings(); });

    async function submitListing() {
        formError = "";
        if (!newTitle.trim())       { formError = "Title is required"; return; }
        if (newPrice < 0)           { formError = "Price cannot be negative"; return; }

        submitting = true;
        try {
            await createListing(
                newType,
                newTitle.trim(),
                newDescription,
                newPrice,
                $session?.handle ?? "",
            );
            newTitle = ""; newDescription = ""; newPrice = 0; showForm = false;
            await loadListings();
        } catch (e) {
            formError = e instanceof Error ? e.message : "Failed to create listing";
        } finally {
            submitting = false;
        }
    }

    async function onCancel(id: string) {
        try {
            await cancelListing(id);
            await loadListings();
        } catch (e) {
            alert(e instanceof Error ? e.message : "Cancel failed");
        }
    }

    async function onPurchase(id: string) {
        try {
            await purchaseListing(id);
            await loadListings();
        } catch (e) {
            alert(e instanceof Error ? e.message : "Purchase failed");
        }
    }
</script>

<div class="listings-page">
    <header class="page-header">
        <div class="header-row">
            <div class="header-left">
                <AppSwitcher />
                <h1>Market</h1>
            </div>
            <div class="header-actions">
                <button class="btn-outline" onclick={() => { showForm = !showForm; formError = ""; }}>
                    {showForm ? "Cancel" : "+ New Listing"}
                </button>
                <button class="btn-ghost" onclick={() => session.logout()}>Sign out</button>
            </div>
        </div>

        <div class="filters">
            {#each (["all", "item", "service"] as const) as t}
                <button
                    class="filter-btn"
                    class:active={filterType === t}
                    onclick={() => { filterType = t; }}
                >
                    {t === "all" ? "All" : t === "item" ? "Items" : "Services"}
                </button>
            {/each}
        </div>
    </header>

    {#if showForm}
        <div class="new-listing-form">
            <h2>New Listing</h2>
            {#if formError}
                <div class="error-banner">{formError}</div>
            {/if}
            <form onsubmit={(e) => { e.preventDefault(); submitListing(); }}>
                <div class="form-row">
                    <label>
                        Type
                        <select bind:value={newType}>
                            <option value="item">Item</option>
                            <option value="service">Service</option>
                        </select>
                    </label>
                    <label>
                        Price (kin)
                        <input type="number" min="0" step="1" bind:value={newPrice} />
                    </label>
                </div>
                <label>
                    Title
                    <input type="text" bind:value={newTitle} placeholder="What are you offering?" maxlength={100} />
                </label>
                <label>
                    Description
                    <textarea bind:value={newDescription} rows="3" placeholder="More details…" maxlength={1000}></textarea>
                </label>
                <button type="submit" class="btn-primary" disabled={submitting}>
                    {submitting ? "Posting…" : "Post Listing"}
                </button>
            </form>
        </div>
    {/if}

    {#if loading}
        <p class="loading">Loading listings…</p>
    {:else if error}
        <div class="error-banner">{error}</div>
    {:else if listings.length === 0}
        <p class="empty">No listings yet. Be the first to post!</p>
    {:else}
        <div class="listing-grid">
            {#each listings as listing (listing.id)}
                <ListingCard
                    {listing}
                    onCancel={onCancel}
                    onPurchase={onPurchase}
                />
            {/each}
        </div>
    {/if}
</div>

<style>
    .listings-page {
        max-width: 900px;
        margin: 0 auto;
        padding: 1rem 1.5rem 4rem;
    }

    .page-header {
        padding: 1.5rem 0 1rem;
        border-bottom: 1px solid #e5e7eb;
        margin-bottom: 1.5rem;
    }

    .header-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
    }

    .header-left {
        display: flex;
        align-items: center;
        gap: 0.75rem;
    }

    h1 {
        font-size: 1.5rem;
        font-weight: 700;
        color: #14532d;
        margin: 0;
    }

    .header-actions {
        display: flex;
        gap: 0.5rem;
        align-items: center;
    }

    .filters {
        display: flex;
        gap: 0.5rem;
    }

    .filter-btn {
        padding: 0.375rem 0.875rem;
        border-radius: 999px;
        border: 1px solid #d1d5db;
        background: white;
        font-size: 0.875rem;
        cursor: pointer;
        color: #374151;
    }

    .filter-btn.active {
        background: #16a34a;
        color: white;
        border-color: #16a34a;
    }

    .new-listing-form {
        background: white;
        border: 1px solid #d1d5db;
        border-radius: 1rem;
        padding: 1.5rem;
        margin-bottom: 1.5rem;
    }

    h2 {
        font-size: 1.1rem;
        font-weight: 600;
        margin: 0 0 1rem;
        color: #111827;
    }

    .error-banner {
        background: #fee2e2;
        color: #991b1b;
        border-radius: 0.5rem;
        padding: 0.625rem 0.875rem;
        font-size: 0.875rem;
        margin-bottom: 1rem;
    }

    form {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    .form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.75rem;
    }

    label {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        font-size: 0.875rem;
        font-weight: 500;
        color: #374151;
    }

    input, select, textarea {
        padding: 0.5rem 0.75rem;
        border: 1px solid #d1d5db;
        border-radius: 0.5rem;
        font-size: 1rem;
        font-family: inherit;
        outline: none;
    }

    input:focus, select:focus, textarea:focus {
        border-color: #16a34a;
        box-shadow: 0 0 0 2px rgba(22,163,74,0.15);
    }

    textarea { resize: vertical; }

    .btn-primary {
        padding: 0.625rem 1.25rem;
        background: #16a34a;
        color: white;
        font-size: 0.95rem;
        font-weight: 600;
        border: none;
        border-radius: 0.5rem;
        cursor: pointer;
        align-self: flex-start;
    }

    .btn-primary:hover:not(:disabled) { background: #15803d; }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

    .btn-outline {
        padding: 0.5rem 1rem;
        border: 1px solid #16a34a;
        color: #16a34a;
        background: white;
        border-radius: 0.5rem;
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
    }

    .btn-outline:hover { background: #f0fdf4; }

    .btn-ghost {
        padding: 0.5rem 0.75rem;
        border: none;
        color: #6b7280;
        background: transparent;
        font-size: 0.875rem;
        cursor: pointer;
    }

    .btn-ghost:hover { color: #111827; }

    .loading, .empty {
        text-align: center;
        color: #9ca3af;
        padding: 3rem 0;
    }

    .listing-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 1rem;
    }
</style>
