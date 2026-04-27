<script lang="ts">
    import { listLocations, createLocation, updateLocation, deleteLocation } from "../lib/api.js";
    import type { LocationDto } from "../lib/api.js";

    let locations: LocationDto[] = $state([]);
    let loading = $state(true);
    let error = $state("");

    // New / edit form
    let showForm = $state(false);
    let editing = $state<LocationDto | null>(null);
    let formName = $state("");
    let formAddress = $state("");
    let formLat = $state("");
    let formLng = $state("");
    let formDesc = $state("");
    let saving = $state(false);
    let formError = $state("");

    // Delete state
    let deletingId = $state<string | null>(null);

    async function load() {
        loading = true;
        error = "";
        try {
            locations = await listLocations();
        } catch (e) {
            error = e instanceof Error ? e.message : "Failed to load locations";
        } finally {
            loading = false;
        }
    }

    $effect(() => { load(); });

    function openNew() {
        editing = null;
        formName = "";
        formAddress = "";
        formLat = "";
        formLng = "";
        formDesc = "";
        formError = "";
        showForm = true;
    }

    function openEdit(loc: LocationDto) {
        editing = loc;
        formName = loc.name;
        formAddress = loc.address;
        formLat = loc.lat != null ? String(loc.lat) : "";
        formLng = loc.lng != null ? String(loc.lng) : "";
        formDesc = loc.description;
        formError = "";
        showForm = true;
    }

    function closeForm() {
        showForm = false;
        editing = null;
        formError = "";
    }

    function parsedCoord(v: string): number | null {
        const n = parseFloat(v);
        return isNaN(n) ? null : n;
    }

    async function submit() {
        if (!formName.trim() || !formAddress.trim()) {
            formError = "Name and address are required.";
            return;
        }
        const lat = parsedCoord(formLat);
        const lng = parsedCoord(formLng);
        if (formLat.trim() && lat === null) { formError = "Latitude must be a number."; return; }
        if (formLng.trim() && lng === null) { formError = "Longitude must be a number."; return; }

        saving = true;
        formError = "";
        try {
            if (editing) {
                const updated = await updateLocation(editing.id, {
                    name: formName.trim(), address: formAddress.trim(), lat, lng, description: formDesc.trim(),
                });
                locations = locations.map(l => l.id === updated.id ? updated : l);
            } else {
                const created = await createLocation({
                    name: formName.trim(), address: formAddress.trim(), lat, lng, description: formDesc.trim(),
                });
                locations = [...locations, created];
            }
            closeForm();
        } catch (e) {
            formError = e instanceof Error ? e.message : "Failed to save location";
        } finally {
            saving = false;
        }
    }

    async function onDelete(id: string) {
        deletingId = id;
        try {
            await deleteLocation(id);
            locations = locations.filter(l => l.id !== id);
        } catch {
            // ignore
        } finally {
            deletingId = null;
        }
    }

    function mapsUrl(loc: LocationDto): string | null {
        if (loc.lat != null && loc.lng != null) {
            return `https://www.openstreetmap.org/?mlat=${loc.lat}&mlon=${loc.lng}&zoom=16`;
        }
        return null;
    }
</script>

<div class="locations-page">
    <div class="page-header">
        <div>
            <h2 class="page-title">Locations</h2>
            <p class="page-sub">Named places in and around the community.</p>
        </div>
        <button class="btn-add" onclick={openNew}>+ New location</button>
    </div>

    {#if showForm}
        <form class="location-form" onsubmit={(e) => { e.preventDefault(); submit(); }}>
            <h3 class="form-title">{editing ? "Edit location" : "New location"}</h3>

            {#if formError}
                <p class="form-error">{formError}</p>
            {/if}

            <label class="field">
                <span class="field-label">Name *</span>
                <input class="input" type="text" bind:value={formName} placeholder="e.g. Town Hall" required />
            </label>

            <label class="field">
                <span class="field-label">Address *</span>
                <input class="input" type="text" bind:value={formAddress} placeholder="e.g. 12 Main Street" required />
            </label>

            <div class="coord-row">
                <label class="field">
                    <span class="field-label">Latitude</span>
                    <input class="input" type="text" bind:value={formLat} placeholder="e.g. 51.5074" inputmode="decimal" />
                </label>
                <label class="field">
                    <span class="field-label">Longitude</span>
                    <input class="input" type="text" bind:value={formLng} placeholder="e.g. -0.1278" inputmode="decimal" />
                </label>
            </div>

            <label class="field">
                <span class="field-label">Description</span>
                <input class="input" type="text" bind:value={formDesc} placeholder="Optional notes about this location" />
            </label>

            <div class="form-actions">
                <button class="btn-secondary" type="button" onclick={closeForm}>Cancel</button>
                <button class="btn-primary" type="submit" disabled={saving}>
                    {saving ? "Saving…" : editing ? "Save changes" : "Create location"}
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
    {:else if locations.length === 0}
        <p class="empty-msg">No locations yet. Add one to get started.</p>
    {:else}
        <div class="location-list">
            {#each locations as loc (loc.id)}
                {@const url = mapsUrl(loc)}
                <div class="location-card">
                    <div class="card-main">
                        <div class="card-header">
                            <span class="loc-name">{loc.name}</span>
                            <div class="card-actions">
                                <button class="action-btn" onclick={() => openEdit(loc)} aria-label="Edit">Edit</button>
                                <button class="action-btn danger" onclick={() => onDelete(loc.id)}
                                    disabled={deletingId === loc.id} aria-label="Delete">
                                    {deletingId === loc.id ? "…" : "Delete"}
                                </button>
                            </div>
                        </div>

                        <p class="loc-address">{loc.address}</p>

                        {#if loc.description}
                            <p class="loc-desc">{loc.description}</p>
                        {/if}

                        {#if loc.lat != null && loc.lng != null}
                            <div class="coords-row">
                                <span class="coord-tag">
                                    📍 {loc.lat.toFixed(5)}, {loc.lng.toFixed(5)}
                                </span>
                                {#if url}
                                    <a class="map-link" href={url} target="_blank" rel="noopener noreferrer">
                                        Open map ↗
                                    </a>
                                {/if}
                            </div>
                        {/if}
                    </div>
                </div>
            {/each}
        </div>
    {/if}
</div>

<style>
    .locations-page {
        padding: 1.5rem 1.5rem 6rem;
        max-width: 560px;
        margin: 0 auto;
    }

    @media (min-width: 768px) {
        .locations-page { padding-bottom: 2rem; max-width: 860px; }
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
        font-size: 0.85rem;
        font-weight: 600;
        color: #fff;
        background: #16a34a;
        border: none;
        border-radius: 0.5rem;
        padding: 0.45rem 0.9rem;
        cursor: pointer;
        white-space: nowrap;
        flex-shrink: 0;
        transition: background 0.15s;
    }
    .btn-add:hover { background: #15803d; }

    /* ── Form ─────────────────────────────────────────────────────────────── */
    .location-form {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 0.875rem;
        padding: 1.25rem 1.25rem 1rem;
        margin-bottom: 1.5rem;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    .form-title { font-size: 0.95rem; font-weight: 600; color: #0f172a; margin: 0 0 0.25rem; }

    .field {
        display: flex;
        flex-direction: column;
        gap: 0.3rem;
    }

    .field-label { font-size: 0.78rem; font-weight: 500; color: #475569; }

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

    .coord-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.75rem;
    }

    .form-actions {
        display: flex;
        gap: 0.75rem;
        justify-content: flex-end;
        margin-top: 0.25rem;
    }

    .btn-primary {
        font-size: 0.85rem; font-weight: 600;
        color: #fff; background: #3b82f6;
        border: none; border-radius: 0.5rem;
        padding: 0.45rem 1rem; cursor: pointer;
        transition: background 0.15s;
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

    .form-error { font-size: 0.82rem; color: #ef4444; margin: 0; }

    /* ── Cards ────────────────────────────────────────────────────────────── */
    .location-list {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    @media (min-width: 768px) {
        .location-list {
            display: grid;
            grid-template-columns: 1fr 1fr;
        }
    }

    .location-card {
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 0.875rem;
        padding: 1rem 1.1rem;
    }

    .card-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 0.5rem;
        margin-bottom: 0.3rem;
    }

    .loc-name {
        font-size: 0.95rem;
        font-weight: 600;
        color: #0f172a;
    }

    .card-actions { display: flex; gap: 0.4rem; flex-shrink: 0; }

    .action-btn {
        font-size: 0.72rem;
        font-weight: 500;
        color: #64748b;
        background: none;
        border: 1px solid #e2e8f0;
        border-radius: 0.375rem;
        padding: 0.15rem 0.5rem;
        cursor: pointer;
        transition: background 0.15s;
    }
    .action-btn:hover:not(:disabled) { background: #f8fafc; }
    .action-btn.danger { color: #ef4444; border-color: #fecaca; }
    .action-btn.danger:hover:not(:disabled) { background: #fef2f2; }
    .action-btn:disabled { opacity: 0.5; cursor: not-allowed; }

    .loc-address { font-size: 0.85rem; color: #475569; margin: 0 0 0.3rem; }
    .loc-desc    { font-size: 0.8rem; color: #94a3b8; margin: 0 0 0.4rem; line-height: 1.4; }

    .coords-row {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        margin-top: 0.4rem;
    }

    .coord-tag {
        font-size: 0.75rem;
        color: #64748b;
        background: #f1f5f9;
        border-radius: 9999px;
        padding: 0.15rem 0.6rem;
    }

    .map-link {
        font-size: 0.75rem;
        color: #3b82f6;
        text-decoration: none;
    }
    .map-link:hover { text-decoration: underline; }

    /* ── Misc ─────────────────────────────────────────────────────────────── */
    .empty-msg { font-size: 0.875rem; color: #94a3b8; padding: 1rem 0; }
    .error-msg { font-size: 0.875rem; color: #ef4444; padding: 1rem 0; }

    .skeleton {
        height: 5rem;
        border-radius: 0.875rem;
        background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
        background-size: 200% 100%;
        animation: shimmer 1.2s infinite;
        margin-bottom: 0.75rem;
    }
    .skeleton.short { height: 3rem; width: 60%; }

    @keyframes shimmer {
        0%   { background-position: 200% 0; }
        100% { background-position: -200% 0; }
    }
</style>
