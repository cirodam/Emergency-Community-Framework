<script lang="ts">
    import {
        listServices,
        createService,
        updateService,
        deleteService,
        type ServiceProfileDto,
        type ServiceCategory,
        type ServiceRateUnit,
        type ServiceAvailability,
    } from "../lib/api.js";
    import { session } from "../lib/session.js";

    const CATEGORIES: ServiceCategory[] = [
        "plumbing", "electrical", "childcare", "transport",
        "cleaning", "farming", "construction", "healthcare", "education", "other",
    ];
    const RATE_UNITS: ServiceRateUnit[] = ["per-hour", "per-job", "negotiable"];
    const RATE_UNIT_LABELS: Record<ServiceRateUnit, string> = {
        "per-hour":   "/hr",
        "per-job":    "/job",
        "negotiable": "neg.",
    };
    const AVAIL_LABELS: Record<ServiceAvailability, string> = {
        "available":       "Available",
        "busy":            "Busy",
        "by-appointment":  "By Appointment",
    };

    let profiles    = $state<ServiceProfileDto[]>([]);
    let loading     = $state(true);
    let error       = $state("");
    let filter      = $state<ServiceCategory | "all">("all");

    // Create form
    let showForm    = $state(false);
    let newName     = $state("");
    let newCat      = $state<ServiceCategory>("other");
    let newDesc     = $state("");
    let newRate     = $state("");
    let newRateUnit = $state<ServiceRateUnit>("per-hour");
    let newAvail    = $state<ServiceAvailability>("available");
    let formError   = $state("");
    let saving      = $state(false);

    // Edit
    let editId      = $state<string | null>(null);
    let editName    = $state("");
    let editCat     = $state<ServiceCategory>("other");
    let editDesc    = $state("");
    let editRate    = $state("");
    let editRateUnit = $state<ServiceRateUnit>("per-hour");
    let editAvail   = $state<ServiceAvailability>("available");

    const myId = $derived(session.personId);
    const filtered = $derived(
        filter === "all" ? profiles : profiles.filter(p => p.category === filter)
    );

    async function load() {
        loading = true;
        error   = "";
        try {
            profiles = await listServices();
        } catch {
            error = "Failed to load services";
        } finally {
            loading = false;
        }
    }

    async function handleCreate() {
        if (!newName.trim()) { formError = "Name is required"; return; }
        saving    = true;
        formError = "";
        try {
            const p = await createService({
                name:         newName.trim(),
                category:     newCat,
                description:  newDesc.trim(),
                rate:         newRate ? parseFloat(newRate) : null,
                rateUnit:     newRateUnit,
                availability: newAvail,
            });
            profiles = [p, ...profiles];
            showForm = false; newName = ""; newDesc = ""; newRate = "";
        } catch (e) {
            formError = e instanceof Error ? e.message : "Failed to create service";
        } finally {
            saving = false;
        }
    }

    function startEdit(p: ServiceProfileDto) {
        editId       = p.id;
        editName     = p.name;
        editCat      = p.category;
        editDesc     = p.description;
        editRate     = p.rate != null ? String(p.rate) : "";
        editRateUnit = p.rateUnit;
        editAvail    = p.availability;
    }

    async function handleUpdate(id: string) {
        saving = true;
        try {
            const updated = await updateService(id, {
                name:         editName.trim(),
                category:     editCat,
                description:  editDesc.trim(),
                rate:         editRate ? parseFloat(editRate) : null,
                rateUnit:     editRateUnit,
                availability: editAvail,
            });
            profiles = profiles.map(p => p.id === id ? updated : p);
            editId = null;
        } catch (e) {
            formError = e instanceof Error ? e.message : "Update failed";
        } finally {
            saving = false;
        }
    }

    async function handleDelete(id: string) {
        if (!confirm("Delete your service profile?")) return;
        try {
            await deleteService(id);
            profiles = profiles.filter(p => p.id !== id);
        } catch {
            error = "Failed to delete service";
        }
    }

    function availClass(a: ServiceAvailability) {
        return a === "available" ? "avail-open" : a === "busy" ? "avail-busy" : "avail-appt";
    }

    load();
</script>

<div class="page">
    <div class="page-header">
        <h2>Services</h2>
        {#if myId}
            <button class="btn-primary" onclick={() => { showForm = !showForm; formError = ""; }}>
                {showForm ? "✕ Close" : "+ Offer Service"}
            </button>
        {/if}
    </div>

    {#if showForm}
        <div class="card form-card">
            <h3>Offer a Service</h3>
            <div class="field">
                <label>Name *</label>
                <input bind:value={newName} placeholder="e.g. Plumbing Repairs" />
            </div>
            <div class="field">
                <label>Category</label>
                <select bind:value={newCat}>
                    {#each CATEGORIES as cat}
                        <option value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                    {/each}
                </select>
            </div>
            <div class="field">
                <label>Description</label>
                <textarea bind:value={newDesc} rows="3" placeholder="What you offer..."></textarea>
            </div>
            <div class="field-row">
                <div class="field">
                    <label>Rate</label>
                    <input type="number" min="0" step="0.01" bind:value={newRate} placeholder="0.00" />
                </div>
                <div class="field">
                    <label>Per</label>
                    <select bind:value={newRateUnit}>
                        {#each RATE_UNITS as u}
                            <option value={u}>{RATE_UNIT_LABELS[u]}</option>
                        {/each}
                    </select>
                </div>
            </div>
            <div class="field">
                <label>Availability</label>
                <select bind:value={newAvail}>
                    <option value="available">Available</option>
                    <option value="busy">Busy</option>
                    <option value="by-appointment">By Appointment</option>
                </select>
            </div>
            {#if formError}<p class="error">{formError}</p>{/if}
            <div class="form-actions">
                <button class="btn-primary" onclick={handleCreate} disabled={saving}>Post</button>
                <button onclick={() => { showForm = false; formError = ""; }}>Cancel</button>
            </div>
        </div>
    {/if}

    <!-- Category filter -->
    <div class="filter-bar">
        <button class:active={filter === "all"} onclick={() => filter = "all"}>All</button>
        {#each CATEGORIES as cat}
            <button class:active={filter === cat} onclick={() => filter = cat}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
        {/each}
    </div>

    {#if loading}
        <div class="skeleton-list">
            {#each [1,2,3] as _}<div class="skeleton-card"></div>{/each}
        </div>
    {:else if error}
        <p class="error">{error}</p>
    {:else if filtered.length === 0}
        <p class="empty">No services listed in this category.</p>
    {:else}
        <div class="card-list">
            {#each filtered as p (p.id)}
                <div class="card service-card">
                    {#if editId === p.id}
                        <div class="field"><label>Name *</label><input bind:value={editName} /></div>
                        <div class="field">
                            <label>Category</label>
                            <select bind:value={editCat}>
                                {#each CATEGORIES as cat}
                                    <option value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                                {/each}
                            </select>
                        </div>
                        <div class="field"><label>Description</label><textarea bind:value={editDesc} rows="3"></textarea></div>
                        <div class="field-row">
                            <div class="field">
                                <label>Rate</label>
                                <input type="number" min="0" step="0.01" bind:value={editRate} />
                            </div>
                            <div class="field">
                                <label>Per</label>
                                <select bind:value={editRateUnit}>
                                    {#each RATE_UNITS as u}
                                        <option value={u}>{RATE_UNIT_LABELS[u]}</option>
                                    {/each}
                                </select>
                            </div>
                        </div>
                        <div class="field">
                            <label>Availability</label>
                            <select bind:value={editAvail}>
                                <option value="available">Available</option>
                                <option value="busy">Busy</option>
                                <option value="by-appointment">By Appointment</option>
                            </select>
                        </div>
                        {#if formError}<p class="error">{formError}</p>{/if}
                        <div class="form-actions">
                            <button class="btn-primary" onclick={() => handleUpdate(p.id)} disabled={saving}>Save</button>
                            <button onclick={() => editId = null}>Cancel</button>
                        </div>
                    {:else}
                        <div class="service-header">
                            <span class="badge category-badge">{p.category}</span>
                            <span class="badge avail-badge {availClass(p.availability)}">{AVAIL_LABELS[p.availability]}</span>
                            {#if p.rate != null}
                                <span class="badge rate-badge">${p.rate.toFixed(2)}{RATE_UNIT_LABELS[p.rateUnit]}</span>
                            {:else if p.rateUnit === "negotiable"}
                                <span class="badge rate-badge">Negotiable</span>
                            {/if}
                        </div>
                        <h3 class="service-title">{p.name}</h3>
                        <p class="service-meta">{p.providerHandle || p.providerId}</p>
                        {#if p.description}<p class="service-desc">{p.description}</p>{/if}
                        {#if myId === p.providerId}
                            <div class="card-actions">
                                <button onclick={() => startEdit(p)}>Edit</button>
                                <button class="btn-danger" onclick={() => handleDelete(p.id)}>Delete</button>
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
.service-header { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.4rem; }
.service-title { margin: 0 0 0.2rem; font-size: 1rem; }
.service-meta { margin: 0 0 0.3rem; font-size: 0.8rem; color: #888; }
.service-desc { margin: 0; font-size: 0.9rem; color: #555; }
.badge { display: inline-block; padding: 0.2rem 0.6rem; border-radius: 999px; font-size: 0.75rem; font-weight: 600; }
.category-badge { background: #e8f0fe; color: #1a56db; }
.rate-badge { background: #f5f5f5; color: #333; border: 1px solid #ddd; }
.avail-open { background: #e8f5e9; color: #2e7d32; }
.avail-busy { background: #fce4ec; color: #880e4f; }
.avail-appt { background: #fff8e1; color: #f57f17; }
.card-actions { display: flex; gap: 0.5rem; margin-top: 0.75rem; }
.form-actions { display: flex; gap: 0.5rem; margin-top: 0.75rem; }
.field-row { display: flex; gap: 0.75rem; }
.field-row .field { flex: 1; }
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
