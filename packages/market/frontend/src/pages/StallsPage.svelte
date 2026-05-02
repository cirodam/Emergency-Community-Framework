<script lang="ts">
    import {
        listStalls,
        listMarketplaces,
        createStall,
        updateStall,
        deleteStall,
        adminSuspendStall,
        adminUnsuspendStall,
        type StallDto,
        type StallCategory,
        type MarketplaceDto,
    } from "../lib/api.js";
    import { selectedStallId, currentPage } from "../lib/nav.js";
    import { session, isCoordinator } from "../lib/session.js";

    const CATEGORIES: StallCategory[] = ["produce", "food", "clothing", "crafts", "tools", "other"];

    let stalls       = $state<StallDto[]>([]);
    let marketplaces = $state<MarketplaceDto[]>([]);
    let loading      = $state(true);
    let error        = $state("");
    let filterMpId   = $state<string>("all");

    // Create form
    let showForm     = $state(false);
    let newMpId      = $state("");
    let newName      = $state("");
    let newDesc      = $state("");
    let newCategory  = $state<StallCategory>("produce");
    let newStallNum  = $state("");
    let formError    = $state("");
    let saving       = $state(false);

    // Edit
    let editId       = $state<string | null>(null);
    let editName     = $state("");
    let editDesc     = $state("");
    let editCategory = $state<StallCategory>("produce");
    let editStallNum = $state("");
    let editStatus   = $state<"active" | "inactive">("active");

    const myId = $derived(session.personId);
    const filtered = $derived(
        filterMpId === "all" ? stalls : stalls.filter(s => s.marketplaceId === filterMpId)
    );

    async function load() {
        loading = true;
        error   = "";
        try {
            [stalls, marketplaces] = await Promise.all([listStalls(), listMarketplaces()]);
            if (marketplaces.length && !newMpId) newMpId = marketplaces[0].id;
        } catch {
            error = "Failed to load stalls";
        } finally {
            loading = false;
        }
    }

    function mpName(id: string) {
        return marketplaces.find(m => m.id === id)?.name ?? id;
    }

    async function handleCreate() {
        if (!newName.trim()) { formError = "Name is required"; return; }
        if (!newMpId)        { formError = "Select a marketplace"; return; }
        saving    = true;
        formError = "";
        const mp = marketplaces.find(m => m.id === newMpId);
        try {
            const s = await createStall({
                marketplaceId:   newMpId,
                marketplaceName: mp?.name ?? "",
                name:            newName.trim(),
                description:     newDesc.trim(),
                category:        newCategory,
                stallNumber:     newStallNum.trim(),
            });
            stalls = [s, ...stalls];
            showForm = false; newName = ""; newDesc = ""; newStallNum = "";
        } catch (e) {
            formError = e instanceof Error ? e.message : "Failed to create stall";
        } finally {
            saving = false;
        }
    }

    function startEdit(s: StallDto) {
        editId       = s.id;
        editName     = s.name;
        editDesc     = s.description;
        editCategory = s.category;
        editStallNum = s.stallNumber;
        editStatus   = s.status;
    }

    async function handleUpdate(id: string) {
        saving = true;
        try {
            const updated = await updateStall(id, {
                name:        editName.trim(),
                description: editDesc.trim(),
                category:    editCategory,
                stallNumber: editStallNum.trim(),
                status:      editStatus,
            });
            stalls = stalls.map(s => s.id === id ? updated : s);
            editId = null;
        } catch (e) {
            formError = e instanceof Error ? e.message : "Update failed";
        } finally {
            saving = false;
        }
    }

    async function handleDelete(id: string) {
        if (!confirm("Remove this stall?")) return;
        try {
            await deleteStall(id);
            stalls = stalls.filter(s => s.id !== id);
        } catch {
            error = "Failed to delete stall";
        }
    }

    async function handleAdminSuspend(s: StallDto) {
        const action = s.status === "active" ? "suspend" : "unsuspend";
        if (!confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} this stall as coordinator?`)) return;
        try {
            const updated = s.status === "active"
                ? await adminSuspendStall(s.id)
                : await adminUnsuspendStall(s.id);
            stalls = stalls.map(x => x.id === s.id ? updated : x);
        } catch (e) {
            error = e instanceof Error ? e.message : `Failed to ${action} stall`;
        }
    }

    function openStall(id: string) {
        selectedStallId.set(id);
        currentPage.set("stall");
    }

    load();
</script>

<div class="page">
    <div class="page-header">
        <h2>Market Stalls</h2>
        {#if myId && marketplaces.length}
            <button class="btn-primary" onclick={() => { showForm = !showForm; formError = ""; }}>
                {showForm ? "✕ Close" : "+ Register Stall"}
            </button>
        {/if}
    </div>

    {#if showForm}
        <div class="card form-card">
            <h3>Register a Stall</h3>
            <div class="field">
                <label>Marketplace *</label>
                <select bind:value={newMpId}>
                    {#each marketplaces as mp}
                        <option value={mp.id}>{mp.name}</option>
                    {/each}
                </select>
            </div>
            <div class="field">
                <label>Stall Name *</label>
                <input bind:value={newName} placeholder="Your stall name" />
            </div>
            <div class="field">
                <label>Category</label>
                <select bind:value={newCategory}>
                    {#each CATEGORIES as cat}
                        <option value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                    {/each}
                </select>
            </div>
            <div class="field">
                <label>Stall Number / Location</label>
                <input bind:value={newStallNum} placeholder="e.g. A7" />
            </div>
            <div class="field">
                <label>Description</label>
                <textarea bind:value={newDesc} rows="2" placeholder="What you sell..."></textarea>
            </div>
            {#if formError}<p class="error">{formError}</p>{/if}
            <div class="form-actions">
                <button class="btn-primary" onclick={handleCreate} disabled={saving}>Register</button>
                <button onclick={() => { showForm = false; formError = ""; }}>Cancel</button>
            </div>
        </div>
    {/if}

    <!-- Marketplace filter -->
    {#if marketplaces.length > 1}
        <div class="filter-bar">
            <button class:active={filterMpId === "all"} onclick={() => filterMpId = "all"}>All Markets</button>
            {#each marketplaces as mp}
                <button class:active={filterMpId === mp.id} onclick={() => filterMpId = mp.id}>{mp.name}</button>
            {/each}
        </div>
    {/if}

    {#if loading}
        <div class="skeleton-list">
            {#each [1,2,3] as _}<div class="skeleton-card"></div>{/each}
        </div>
    {:else if error}
        <p class="error">{error}</p>
    {:else if filtered.length === 0}
        <p class="empty">No stalls found.</p>
    {:else}
        <div class="card-list">
            {#each filtered as s (s.id)}
                <div class="card stall-card">
                    {#if editId === s.id}
                        <div class="field"><label>Name *</label><input bind:value={editName} /></div>
                        <div class="field">
                            <label>Category</label>
                            <select bind:value={editCategory}>
                                {#each CATEGORIES as cat}
                                    <option value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                                {/each}
                            </select>
                        </div>
                        <div class="field"><label>Stall Number</label><input bind:value={editStallNum} /></div>
                        <div class="field">
                            <label>Status</label>
                            <select bind:value={editStatus}>
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>
                        </div>
                        <div class="field"><label>Description</label><textarea bind:value={editDesc} rows="2"></textarea></div>
                        {#if formError}<p class="error">{formError}</p>{/if}
                        <div class="form-actions">
                            <button class="btn-primary" onclick={() => handleUpdate(s.id)} disabled={saving}>Save</button>
                            <button onclick={() => editId = null}>Cancel</button>
                        </div>
                    {:else}
                        <div class="stall-header" onclick={() => openStall(s.id)}>
                            <span class="badge category-badge">{s.category}</span>
                            {#if s.stallNumber}<span class="badge stall-num">#{s.stallNumber}</span>{/if}
                            {#if s.status === "inactive"}<span class="badge inactive-badge">Inactive</span>{/if}
                        </div>
                        <h3 class="stall-title" onclick={() => openStall(s.id)}>{s.name}</h3>
                        <p class="stall-meta">{mpName(s.marketplaceId)} · {s.holderHandle}</p>
                        {#if s.description}<p class="stall-desc">{s.description}</p>{/if}
                        {#if $session?.handle === s.holderHandle}
                            <div class="card-actions">
                                <button onclick={() => startEdit(s)}>Edit</button>
                                <button class="btn-danger" onclick={() => handleDelete(s.id)}>Delete</button>
                            </div>
                        {:else if $isCoordinator}
                            <div class="card-actions">
                                <button
                                    class={s.status === "active" ? "btn-danger" : "btn-primary"}
                                    onclick={() => handleAdminSuspend(s)}
                                    title={s.status === "active" ? "Suspend as coordinator" : "Reactivate as coordinator"}
                                >
                                    {s.status === "active" ? "⚑ Suspend" : "⚑ Reactivate"}
                                </button>
                            </div>
                        {/if}
                    {/if}
                </div>
            {/each}
        </div>
    {/if}
</div>

<style>
.page { padding: 1rem; max-width: 700px; margin: 0 auto; }
.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; }
.page-header h2 { margin: 0; }
.filter-bar { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1rem; }
.filter-bar button { padding: 0.3rem 0.8rem; border: 1px solid #ccc; border-radius: 999px; background: #f5f5f5; cursor: pointer; font-size: 0.85rem; }
.filter-bar button.active { background: #333; color: #fff; border-color: #333; }
.card { background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; padding: 1rem; }
.form-card { margin-bottom: 1rem; }
.card-list { display: flex; flex-direction: column; gap: 0.75rem; }
.stall-header { display: flex; gap: 0.5rem; margin-bottom: 0.4rem; cursor: pointer; }
.stall-title { margin: 0 0 0.2rem; font-size: 1rem; cursor: pointer; }
.stall-title:hover { text-decoration: underline; }
.stall-meta { margin: 0 0 0.3rem; font-size: 0.8rem; color: #888; }
.stall-desc { margin: 0; font-size: 0.9rem; color: #555; }
.badge { display: inline-block; padding: 0.2rem 0.6rem; border-radius: 999px; font-size: 0.75rem; font-weight: 600; }
.category-badge { background: #e8f0fe; color: #1a56db; }
.stall-num { background: #f5f5f5; color: #333; border: 1px solid #ddd; }
.inactive-badge { background: #fce4ec; color: #880e4f; }
.card-actions { display: flex; gap: 0.5rem; margin-top: 0.75rem; }
.form-actions { display: flex; gap: 0.5rem; margin-top: 0.75rem; }
.field { display: flex; flex-direction: column; gap: 0.25rem; margin-bottom: 0.75rem; }
.field label { font-size: 0.85rem; font-weight: 600; }
.field input, .field select, .field textarea { padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px; font-size: 0.9rem; }
.field textarea { resize: vertical; }
.btn-primary { background: #333; color: #fff; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-danger { background: #c62828; color: #fff; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; }
button:not(.btn-primary):not(.btn-danger) { background: transparent; border: 1px solid #ccc; padding: 0.4rem 0.9rem; border-radius: 4px; cursor: pointer; }
.skeleton-list { display: flex; flex-direction: column; gap: 0.75rem; }
.skeleton-card { height: 90px; background: #eee; border-radius: 8px; animation: pulse 1.4s ease-in-out infinite; }
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
.empty { color: #888; text-align: center; margin-top: 2rem; }
.error { color: #c62828; }
</style>
