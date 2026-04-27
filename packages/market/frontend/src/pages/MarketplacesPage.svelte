<script lang="ts">
    import {
        listMarketplaces, createMarketplace, updateMarketplace, deleteMarketplace,
        listCommunityLocations,
    } from "../lib/api.js";
    import type { MarketplaceDto, CommunityLocationDto } from "../lib/api.js";
    import { currentPage, selectedMarketplaceId } from "../lib/nav.js";

    let marketplaces = $state<MarketplaceDto[]>([]);
    let locations    = $state<CommunityLocationDto[]>([]);
    let loading      = $state(true);
    let error        = $state("");

    // Form state
    let showForm   = $state(false);
    let editing    = $state<MarketplaceDto | null>(null);
    let formName   = $state("");
    let formLocId  = $state("");
    let formDesc   = $state("");
    let saving     = $state(false);
    let formError  = $state("");

    let deletingId = $state<string | null>(null);

    async function load() {
        loading = true;
        error = "";
        try {
            [marketplaces, locations] = await Promise.all([
                listMarketplaces(),
                listCommunityLocations(),
            ]);
        } catch (e) {
            error = e instanceof Error ? e.message : "Failed to load";
        } finally {
            loading = false;
        }
    }

    $effect(() => { load(); });

    function locationName(id: string): string {
        return locations.find(l => l.id === id)?.name ?? id;
    }

    function openNew() {
        editing = null;
        formName = "";
        formLocId = locations[0]?.id ?? "";
        formDesc = "";
        formError = "";
        showForm = true;
    }

    function openEdit(m: MarketplaceDto) {
        editing = m;
        formName = m.name;
        formLocId = m.locationId;
        formDesc = m.description;
        formError = "";
        showForm = true;
    }

    function closeForm() {
        showForm = false;
        editing = null;
        formError = "";
    }

    async function submit() {
        if (!formName.trim()) { formError = "Name is required."; return; }
        if (!formLocId)       { formError = "Please select a location."; return; }

        const locName = locationName(formLocId);
        saving = true;
        formError = "";
        try {
            if (editing) {
                const updated = await updateMarketplace(editing.id, {
                    name: formName.trim(), locationId: formLocId, locationName: locName, description: formDesc.trim(),
                });
                marketplaces = marketplaces.map(m => m.id === updated.id ? updated : m);
            } else {
                const created = await createMarketplace({
                    name: formName.trim(), locationId: formLocId, locationName: locName, description: formDesc.trim(),
                });
                marketplaces = [...marketplaces, created].sort((a, b) => a.name.localeCompare(b.name));
            }
            closeForm();
        } catch (e) {
            formError = e instanceof Error ? e.message : "Failed to save";
        } finally {
            saving = false;
        }
    }

    async function onDelete(id: string) {
        deletingId = id;
        try {
            await deleteMarketplace(id);
            marketplaces = marketplaces.filter(m => m.id !== id);
        } catch {
            // ignore
        } finally {
            deletingId = null;
        }
    }

    function openMarketplace(id: string) {
        selectedMarketplaceId.set(id);
        currentPage.set("marketplace");
    }
</script>

<div class="page">
    <div class="page-header">
        <div>
            <h2 class="page-title">Marketplaces</h2>
            <p class="page-sub">Physical marketplace locations in the community.</p>
        </div>
        <button class="btn-add" onclick={openNew}>+ New marketplace</button>
    </div>

    {#if showForm}
        <form class="mp-form" onsubmit={(e) => { e.preventDefault(); submit(); }}>
            <h3 class="form-title">{editing ? "Edit marketplace" : "New marketplace"}</h3>

            {#if formError}
                <p class="form-error">{formError}</p>
            {/if}

            <label class="field">
                <span class="field-label">Name *</span>
                <input class="input" type="text" bind:value={formName} placeholder="e.g. Saturday Farmers Market" required />
            </label>

            <label class="field">
                <span class="field-label">Location *</span>
                {#if locations.length === 0}
                    <p class="hint">No locations found. Add locations in the community app first.</p>
                {:else}
                    <select class="input" bind:value={formLocId}>
                        {#each locations as loc (loc.id)}
                            <option value={loc.id}>{loc.name} — {loc.address}</option>
                        {/each}
                    </select>
                {/if}
            </label>

            <label class="field">
                <span class="field-label">Description</span>
                <input class="input" type="text" bind:value={formDesc} placeholder="Optional notes" />
            </label>

            <div class="form-actions">
                <button class="btn-secondary" type="button" onclick={closeForm}>Cancel</button>
                <button class="btn-primary" type="submit" disabled={saving || locations.length === 0}>
                    {saving ? "Saving…" : editing ? "Save changes" : "Create marketplace"}
                </button>
            </div>
        </form>
    {/if}

    {#if loading}
        <div class="skeleton"></div>
        <div class="skeleton short"></div>
        <div class="skeleton"></div>
    {:else if error}
        <p class="error-msg">{error}</p>
    {:else if marketplaces.length === 0}
        <p class="empty-msg">No marketplaces yet.</p>
    {:else}
        <div class="mp-list">
            {#each marketplaces as m (m.id)}
                <div class="mp-card">
                    <button class="card-body" onclick={() => openMarketplace(m.id)}>
                        <div class="mp-name">{m.name}</div>
                        <div class="mp-loc">📍 {m.locationName}</div>
                        {#if m.description}
                            <div class="mp-desc">{m.description}</div>
                        {/if}
                    </button>
                    <div class="card-actions">
                        <button class="action-btn" onclick={() => openEdit(m)}>Edit</button>
                        <button class="action-btn danger" onclick={() => onDelete(m.id)}
                            disabled={deletingId === m.id}>
                            {deletingId === m.id ? "…" : "Delete"}
                        </button>
                    </div>
                </div>
            {/each}
        </div>
    {/if}
</div>

<style>
    .page {
        padding: 1.5rem 1.5rem 6rem;
        max-width: 620px;
        margin: 0 auto;
    }

    .page-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 1rem;
        margin-bottom: 1.5rem;
    }

    .page-title { font-size: 1.4rem; font-weight: 700; color: #0f172a; margin: 0 0 0.2rem; }
    .page-sub   { font-size: 0.85rem; color: #64748b; margin: 0; }

    .btn-add {
        font-size: 0.85rem; font-weight: 600;
        color: #fff; background: #16a34a;
        border: none; border-radius: 0.5rem;
        padding: 0.45rem 0.9rem; cursor: pointer;
        white-space: nowrap; flex-shrink: 0;
        transition: background 0.15s;
    }
    .btn-add:hover { background: #15803d; }

    /* ── Form ────────────────────────────────── */
    .mp-form {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 0.875rem;
        padding: 1.25rem;
        margin-bottom: 1.5rem;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    .form-title { font-size: 0.95rem; font-weight: 600; color: #0f172a; margin: 0; }
    .form-error { font-size: 0.82rem; color: #ef4444; margin: 0; }

    .field { display: flex; flex-direction: column; gap: 0.3rem; }
    .field-label { font-size: 0.78rem; font-weight: 500; color: #475569; }
    .hint { font-size: 0.8rem; color: #94a3b8; margin: 0; }

    .input {
        border: 1px solid #cbd5e1;
        border-radius: 0.5rem;
        padding: 0.5rem 0.75rem;
        font-size: 0.9rem;
        color: #0f172a;
        background: #fff;
        outline: none;
        transition: border-color 0.15s;
    }
    .input:focus { border-color: #3b82f6; }

    .form-actions { display: flex; gap: 0.75rem; justify-content: flex-end; }

    .btn-primary {
        font-size: 0.85rem; font-weight: 600;
        color: #fff; background: #3b82f6;
        border: none; border-radius: 0.5rem;
        padding: 0.45rem 1rem; cursor: pointer;
    }
    .btn-primary:hover:not(:disabled) { background: #2563eb; }
    .btn-primary:disabled { background: #93c5fd; cursor: not-allowed; }

    .btn-secondary {
        font-size: 0.85rem; font-weight: 500;
        color: #475569; background: #f1f5f9;
        border: 1px solid #e2e8f0; border-radius: 0.5rem;
        padding: 0.45rem 0.9rem; cursor: pointer;
    }
    .btn-secondary:hover { background: #e2e8f0; }

    /* ── Cards ───────────────────────────────── */
    .mp-list { display: flex; flex-direction: column; gap: 0.75rem; }

    .mp-card {
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 0.875rem;
        overflow: hidden;
        display: flex;
        flex-direction: column;
    }

    .card-body {
        text-align: left;
        background: none;
        border: none;
        padding: 1rem 1.1rem 0.75rem;
        cursor: pointer;
        width: 100%;
        transition: background 0.1s;
    }
    .card-body:hover { background: #f8fafc; }

    .mp-name { font-size: 0.95rem; font-weight: 600; color: #0f172a; margin-bottom: 0.25rem; }
    .mp-loc  { font-size: 0.82rem; color: #64748b; margin-bottom: 0.2rem; }
    .mp-desc { font-size: 0.8rem; color: #94a3b8; line-height: 1.4; }

    .card-actions {
        display: flex;
        gap: 0.5rem;
        padding: 0.5rem 1rem 0.75rem;
        border-top: 1px solid #f1f5f9;
    }

    .action-btn {
        font-size: 0.72rem; font-weight: 500;
        color: #64748b; background: none;
        border: 1px solid #e2e8f0; border-radius: 0.375rem;
        padding: 0.15rem 0.5rem; cursor: pointer;
    }
    .action-btn:hover:not(:disabled) { background: #f8fafc; }
    .action-btn.danger { color: #ef4444; border-color: #fecaca; }
    .action-btn.danger:hover:not(:disabled) { background: #fef2f2; }
    .action-btn:disabled { opacity: 0.5; cursor: not-allowed; }

    /* ── Misc ───────────────────────────────── */
    .empty-msg { font-size: 0.875rem; color: #94a3b8; }
    .error-msg { font-size: 0.875rem; color: #ef4444; }

    .skeleton {
        height: 5rem; border-radius: 0.875rem; margin-bottom: 0.75rem;
        background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
        background-size: 200% 100%;
        animation: shimmer 1.2s infinite;
    }
    .skeleton.short { height: 3rem; width: 60%; }
    @keyframes shimmer {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
    }
</style>
