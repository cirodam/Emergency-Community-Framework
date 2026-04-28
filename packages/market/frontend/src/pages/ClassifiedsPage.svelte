<script lang="ts">
    import {
        listClassifieds,
        createClassified,
        updateClassified,
        cancelClassified,
        claimClassified,
        type Classified,
        type ClassifiedCategory,
    } from "../lib/api.js";
    import { session } from "../lib/session.js";

    const CATEGORIES: ClassifiedCategory[] = ["for-sale", "wanted", "free", "job", "notice"];
    const CATEGORY_LABELS: Record<ClassifiedCategory, string> = {
        "for-sale": "For Sale",
        "wanted":   "Wanted",
        "free":     "Free",
        "job":      "Jobs",
        "notice":   "Notices",
    };

    let items       = $state<Classified[]>([]);
    let loading     = $state(true);
    let error       = $state("");
    let filter      = $state<ClassifiedCategory | "all">("all");

    // Create form
    let showForm    = $state(false);
    let newCategory = $state<ClassifiedCategory>("for-sale");
    let newTitle    = $state("");
    let newDesc     = $state("");
    let newPrice    = $state("");
    let formError   = $state("");
    let saving      = $state(false);

    // Edit
    let editId      = $state<string | null>(null);
    let editTitle   = $state("");
    let editDesc    = $state("");
    let editPrice   = $state("");

    const myId = $derived($session?.personId);
    const filtered = $derived(
        filter === "all" ? items.filter(c => c.status === "open") : items.filter(c => c.status === "open" && c.category === filter)
    );

    async function load() {
        loading = true;
        error   = "";
        try {
            items = await listClassifieds();
        } catch {
            error = "Failed to load classifieds";
        } finally {
            loading = false;
        }
    }

    async function handleCreate() {
        if (!newTitle.trim()) { formError = "Title is required"; return; }
        saving    = true;
        formError = "";
        try {
            const created = await createClassified({
                category:    newCategory,
                title:       newTitle.trim(),
                description: newDesc.trim(),
                price:       newPrice ? parseFloat(newPrice) : 0,
            });
            items = [created, ...items];
            showForm = false; newTitle = ""; newDesc = ""; newPrice = "";
        } catch (e) {
            formError = e instanceof Error ? e.message : "Failed to create";
        } finally {
            saving = false;
        }
    }

    function startEdit(c: Classified) {
        editId    = c.id;
        editTitle = c.title;
        editDesc  = c.description;
        editPrice = c.price > 0 ? String(c.price) : "";
    }

    async function handleUpdate(id: string) {
        saving = true;
        try {
            const updated = await updateClassified(id, {
                title:       editTitle.trim(),
                description: editDesc.trim(),
                price:       editPrice ? parseFloat(editPrice) : 0,
            });
            items = items.map(c => c.id === id ? updated : c);
            editId = null;
        } catch (e) {
            formError = e instanceof Error ? e.message : "Update failed";
        } finally {
            saving = false;
        }
    }

    async function handleCancel(id: string) {
        if (!confirm("Cancel this classified?")) return;
        try {
            const updated = await cancelClassified(id);
            items = items.map(c => c.id === id ? updated : c);
        } catch {
            error = "Failed to cancel";
        }
    }

    async function handleClaim(id: string) {
        if (!confirm("Claim this classified? This may trigger a payment.")) return;
        try {
            const updated = await claimClassified(id);
            items = items.map(c => c.id === id ? updated : c);
        } catch (e) {
            error = e instanceof Error ? e.message : "Claim failed";
        }
    }

    load();
</script>

<div class="page">
    <div class="page-header">
        <h2>Classifieds</h2>
        {#if myId}
            <button class="btn-primary" onclick={() => { showForm = !showForm; formError = ""; }}>
                {showForm ? "✕ Close" : "+ Post"}
            </button>
        {/if}
    </div>

    {#if showForm}
        <div class="card form-card">
            <h3>Post a Classified</h3>
            <div class="field">
                <label>Category</label>
                <select bind:value={newCategory}>
                    {#each CATEGORIES as cat}
                        <option value={cat}>{CATEGORY_LABELS[cat]}</option>
                    {/each}
                </select>
            </div>
            <div class="field">
                <label>Title *</label>
                <input bind:value={newTitle} placeholder="Brief title" />
            </div>
            <div class="field">
                <label>Description</label>
                <textarea bind:value={newDesc} rows="3" placeholder="Details..."></textarea>
            </div>
            {#if newCategory === "for-sale" || newCategory === "wanted"}
                <div class="field">
                    <label>Price (leave blank for free / negotiable)</label>
                    <input type="number" min="0" step="0.01" bind:value={newPrice} placeholder="0.00" />
                </div>
            {/if}
            {#if formError}<p class="error">{formError}</p>{/if}
            <div class="form-actions">
                <button class="btn-primary" onclick={handleCreate} disabled={saving}>Post</button>
                <button onclick={() => { showForm = false; formError = ""; }}>Cancel</button>
            </div>
        </div>
    {/if}

    <!-- Category filter -->
    <div class="filter-bar">
        <button class:active={filter === "all"}    onclick={() => filter = "all"}>All</button>
        {#each CATEGORIES as cat}
            <button class:active={filter === cat} onclick={() => filter = cat}>{CATEGORY_LABELS[cat]}</button>
        {/each}
    </div>

    {#if loading}
        <div class="skeleton-list">
            {#each [1,2,3] as _}<div class="skeleton-card"></div>{/each}
        </div>
    {:else if error}
        <p class="error">{error}</p>
    {:else if filtered.length === 0}
        <p class="empty">No classifieds in this category.</p>
    {:else}
        <div class="card-list">
            {#each filtered as c (c.id)}
                <div class="card classified-card">
                    {#if editId === c.id}
                        <div class="field"><label>Title *</label><input bind:value={editTitle} /></div>
                        <div class="field"><label>Description</label><textarea bind:value={editDesc} rows="3"></textarea></div>
                        {#if c.category === "for-sale" || c.category === "wanted"}
                            <div class="field"><label>Price</label><input type="number" min="0" step="0.01" bind:value={editPrice} /></div>
                        {/if}
                        {#if formError}<p class="error">{formError}</p>{/if}
                        <div class="form-actions">
                            <button class="btn-primary" onclick={() => handleUpdate(c.id)} disabled={saving}>Save</button>
                            <button onclick={() => editId = null}>Cancel</button>
                        </div>
                    {:else}
                        <div class="classified-header">
                            <span class="badge category-badge {c.category}">{CATEGORY_LABELS[c.category]}</span>
                            {#if c.price > 0}<span class="badge price-badge">${c.price.toFixed(2)}</span>{/if}
                        </div>
                        <h3 class="classified-title">{c.title}</h3>
                        {#if c.description}<p class="classified-desc">{c.description}</p>{/if}
                        <p class="classified-meta">Posted by {c.posterHandle || c.posterId}</p>
                        <div class="card-actions">
                            {#if myId && myId !== c.posterId}
                                <button class="btn-primary" onclick={() => handleClaim(c.id)}>
                                    {c.category === "for-sale" ? "Buy" : c.category === "wanted" ? "Supply" : c.category === "job" ? "Apply" : "Respond"}
                                </button>
                            {/if}
                            {#if myId === c.posterId}
                                <button onclick={() => startEdit(c)}>Edit</button>
                                <button class="btn-danger" onclick={() => handleCancel(c.id)}>Cancel</button>
                            {/if}
                        </div>
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
.filter-bar button { padding: 0.3rem 0.8rem; border: 1px solid #ccc; border-radius: 999px; background: #f5f5f5; color: #333; cursor: pointer; font-size: 0.85rem; }
.filter-bar button.active { background: #333 !important; color: #fff !important; border-color: #333; }
.card { background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; padding: 1rem; }
.form-card { margin-bottom: 1rem; }
.card-list { display: flex; flex-direction: column; gap: 0.75rem; }
.classified-card { }
.classified-header { display: flex; gap: 0.5rem; margin-bottom: 0.5rem; }
.classified-title { margin: 0 0 0.25rem; font-size: 1rem; }
.classified-desc { margin: 0.25rem 0 0.5rem; font-size: 0.9rem; color: #555; }
.classified-meta { margin: 0; font-size: 0.8rem; color: #888; }
.badge { display: inline-block; padding: 0.2rem 0.6rem; border-radius: 999px; font-size: 0.75rem; font-weight: 600; }
.category-badge.for-sale  { background: #e8f5e9; color: #2e7d32; }
.category-badge.wanted    { background: #e3f2fd; color: #1565c0; }
.category-badge.free      { background: #f3e5f5; color: #6a1b9a; }
.category-badge.job       { background: #fff8e1; color: #f57f17; }
.category-badge.notice    { background: #fce4ec; color: #880e4f; }
.price-badge { background: #f5f5f5; color: #333; border: 1px solid #ddd; }
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
.skeleton-card { height: 100px; background: #eee; border-radius: 8px; animation: pulse 1.4s ease-in-out infinite; }
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
.empty { color: #888; text-align: center; margin-top: 2rem; }
.error { color: #c62828; }
</style>
