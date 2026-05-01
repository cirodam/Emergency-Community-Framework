<script lang="ts">
    import {
        listServices,
        createService,
        updateService,
        deleteService,
        sendMailMessage,
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

    // Pagination
    const PAGE_SIZE = 20;
    let page  = $state(1);
    let total = $state(0);
    let pages = $state(1);

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

    // Message compose
    let msgId      = $state<string | null>(null);
    let msgBody    = $state("");
    let msgSending = $state(false);
    let msgError   = $state("");
    let msgSent    = $state(false);

    const myId = $derived($session?.personId);
    // server filters by category; profiles is always the current page
    const filtered = $derived(profiles);

    async function load(p = page) {
        loading = true;
        error   = "";
        try {
            const cat = filter === "all" ? undefined : filter;
            const result = await listServices(cat, p, PAGE_SIZE);
            profiles = result.items;
            total    = result.total;
            pages    = result.pages;
            page     = result.page;
        } catch {
            error = "Failed to load services";
        } finally {
            loading = false;
        }
    }

    function goPage(p: number) { load(p); }

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

    function daysLeft(expiresAt: string): number {
        return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
    }

    function openMessage(p: ServiceProfileDto) {
        msgId    = p.id;
        msgBody  = "";
        msgError = "";
        msgSent  = false;
    }

    async function handleSendMessage(p: ServiceProfileDto) {
        if (!msgBody.trim()) return;
        msgSending = true; msgError = "";
        try {
            await sendMailMessage(
                p.providerId,
                `Re: ${p.name}`,
                `Hi ${p.providerHandle},\n\nI'm interested in your service "${p.name}".\n\n${msgBody.trim()}`,
            );
            msgSent = true;
            setTimeout(() => { msgId = null; msgSent = false; }, 1500);
        } catch (e) {
            msgError = e instanceof Error ? e.message : "Failed to send";
        } finally {
            msgSending = false;
        }
    }

    load(1);
</script>

<div class="page">
    <div class="page-header">
        <div>
            <h2 class="page-title">Services</h2>
            <p class="page-sub">Community members offering their skills and services.</p>
        </div>
        {#if myId}
            <button class="btn-add" onclick={() => { showForm = !showForm; formError = ""; }}>
                {showForm ? "✕ Close" : "+ Offer Service"}
            </button>
        {/if}
    </div>

    {#if showForm}
        <form class="svc-form" onsubmit={(e) => { e.preventDefault(); handleCreate(); }}>
            <h3 class="form-title">Offer a Service</h3>
            {#if formError}<p class="form-error">{formError}</p>{/if}

            <label class="field">
                <span class="field-label">Name *</span>
                <input class="input" type="text" bind:value={newName} placeholder="e.g. Plumbing Repairs" />
            </label>

            <label class="field">
                <span class="field-label">Category</span>
                <select class="input" bind:value={newCat}>
                    {#each CATEGORIES as cat}
                        <option value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                    {/each}
                </select>
            </label>

            <label class="field">
                <span class="field-label">Description</span>
                <textarea class="input" bind:value={newDesc} rows="3" placeholder="What you offer..."></textarea>
            </label>

            <div class="field-row">
                <label class="field">
                    <span class="field-label">Rate</span>
                    <input class="input" type="number" min="0" step="0.01" bind:value={newRate} placeholder="0.00" />
                </label>
                <label class="field">
                    <span class="field-label">Per</span>
                    <select class="input" bind:value={newRateUnit}>
                        {#each RATE_UNITS as u}
                            <option value={u}>{RATE_UNIT_LABELS[u]}</option>
                        {/each}
                    </select>
                </label>
            </div>

            <label class="field">
                <span class="field-label">Availability</span>
                <select class="input" bind:value={newAvail}>
                    <option value="available">Available</option>
                    <option value="busy">Busy</option>
                    <option value="by-appointment">By Appointment</option>
                </select>
            </label>

            <div class="form-actions">
                <button class="btn-secondary" type="button" onclick={() => { showForm = false; formError = ""; }}>Cancel</button>
                <button class="btn-primary" type="submit" disabled={saving}>{saving ? "Posting…" : "Post Service"}</button>
            </div>
        </form>
    {/if}

    <div class="filter-bar">
        <button class="pill" class:active={filter === "all"} onclick={() => { filter = "all"; load(1); }}>All</button>
        {#each CATEGORIES as cat}
            <button class="pill" class:active={filter === cat} onclick={() => { filter = cat; load(1); }}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
        {/each}
    </div>

    {#if loading}
        <div class="skeleton"></div>
        <div class="skeleton short"></div>
        <div class="skeleton"></div>
    {:else if error}
        <p class="error-msg">{error}</p>
    {:else if filtered.length === 0}
        <p class="empty-msg">No services listed in this category.</p>
    {:else}
        <div class="svc-list">
            {#each filtered as p (p.id)}
                <div class="svc-card">
                    {#if editId === p.id}
                        <label class="field">
                            <span class="field-label">Name *</span>
                            <input class="input" bind:value={editName} />
                        </label>
                        <label class="field">
                            <span class="field-label">Category</span>
                            <select class="input" bind:value={editCat}>
                                {#each CATEGORIES as cat}
                                    <option value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
                                {/each}
                            </select>
                        </label>
                        <label class="field">
                            <span class="field-label">Description</span>
                            <textarea class="input" bind:value={editDesc} rows="3"></textarea>
                        </label>
                        <div class="field-row">
                            <label class="field">
                                <span class="field-label">Rate</span>
                                <input class="input" type="number" min="0" step="0.01" bind:value={editRate} />
                            </label>
                            <label class="field">
                                <span class="field-label">Per</span>
                                <select class="input" bind:value={editRateUnit}>
                                    {#each RATE_UNITS as u}
                                        <option value={u}>{RATE_UNIT_LABELS[u]}</option>
                                    {/each}
                                </select>
                            </label>
                        </div>
                        <label class="field">
                            <span class="field-label">Availability</span>
                            <select class="input" bind:value={editAvail}>
                                <option value="available">Available</option>
                                <option value="busy">Busy</option>
                                <option value="by-appointment">By Appointment</option>
                            </select>
                        </label>
                        {#if formError}<p class="form-error">{formError}</p>{/if}
                        <div class="form-actions">
                            <button class="btn-secondary" onclick={() => editId = null}>Cancel</button>
                            <button class="btn-primary" onclick={() => handleUpdate(p.id)} disabled={saving}>Save</button>
                        </div>
                    {:else}
                        <div class="svc-badges">
                            <span class="badge cat">{p.category}</span>
                            <span class="badge avail {availClass(p.availability)}">{AVAIL_LABELS[p.availability]}</span>
                            {#if p.rate != null}
                                <span class="badge rate">${p.rate.toFixed(2)}{RATE_UNIT_LABELS[p.rateUnit]}</span>
                            {:else if p.rateUnit === "negotiable"}
                                <span class="badge rate">Negotiable</span>
                            {/if}
                        </div>
                        <div class="svc-name">{p.name}</div>
                        <p class="svc-meta">{p.providerHandle || p.providerId} · expires in {daysLeft(p.expiresAt)}d</p>
                        {#if p.description}<p class="svc-desc">{p.description}</p>{/if}
                        {#if msgId === p.id}
                            {#if msgSent}
                                <p class="msg-sent">Message sent ✓</p>
                            {:else}
                                <div class="msg-compose">
                                    <textarea
                                        class="input"
                                        rows="3"
                                        placeholder="Write your message…"
                                        bind:value={msgBody}
                                    ></textarea>
                                    {#if msgError}<p class="form-error">{msgError}</p>{/if}
                                    <div class="form-actions">
                                        <button class="btn-secondary" onclick={() => msgId = null}>Cancel</button>
                                        <button class="btn-primary" onclick={() => handleSendMessage(p)} disabled={msgSending || !msgBody.trim()}>
                                            {msgSending ? "Sending…" : "Send"}
                                        </button>
                                    </div>
                                </div>
                            {/if}
                        {:else}
                            <div class="card-actions">
                                {#if myId === p.providerId}
                                    <button class="action-btn" onclick={() => startEdit(p)}>Edit</button>
                                    <button class="action-btn danger" onclick={() => handleDelete(p.id)}>Delete</button>
                                {:else if myId}
                                    <button class="btn-primary" onclick={() => openMessage(p)}>Message provider</button>
                                {/if}
                            </div>
                        {/if}
                    {/if}
                </div>
            {/each}
        </div>
        {#if pages > 1}
            <div class="pagination">
                <button class="page-btn" onclick={() => goPage(page - 1)} disabled={page <= 1}>‹ Prev</button>
                <span class="page-info">{page} / {pages}</span>
                <button class="page-btn" onclick={() => goPage(page + 1)} disabled={page >= pages}>Next ›</button>
            </div>
        {/if}
    {/if}
</div>

<style>
    .page {
        padding: 1.5rem 1.5rem 6rem;
        max-width: 640px;
        margin: 0 auto;
    }

    .page-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 1rem;
        margin-bottom: 1.25rem;
    }

    .page-title { font-size: 1.4rem; font-weight: 700; color: #0f172a; margin: 0 0 0.2rem; }
    .page-sub   { font-size: 0.85rem; color: #64748b; margin: 0; }

    .btn-add {
        font-size: 0.85rem; font-weight: 600;
        color: #fff; background: #16a34a;
        border: none; border-radius: 0.5rem;
        padding: 0.45rem 0.9rem; cursor: pointer;
        white-space: nowrap; flex-shrink: 0;
    }
    .btn-add:hover { background: #15803d; }

    /* ── Form ── */
    .svc-form {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 0.875rem;
        padding: 1.25rem;
        margin-bottom: 1.25rem;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    .form-title { font-size: 0.95rem; font-weight: 600; color: #0f172a; margin: 0; }
    .form-error { font-size: 0.82rem; color: #ef4444; margin: 0; }

    .field       { display: flex; flex-direction: column; gap: 0.3rem; }
    .field-label { font-size: 0.78rem; font-weight: 500; color: #475569; }
    .field-row   { display: flex; gap: 0.75rem; }
    .field-row .field { flex: 1; }

    .input {
        border: 1px solid #cbd5e1;
        border-radius: 0.5rem;
        padding: 0.5rem 0.75rem;
        font-size: 0.9rem;
        color: #0f172a;
        background: #fff;
        outline: none;
        font-family: inherit;
        width: 100%;
        box-sizing: border-box;
        transition: border-color 0.15s;
    }
    .input:focus   { border-color: #3b82f6; }
    textarea.input { resize: vertical; }

    .form-actions { display: flex; gap: 0.75rem; justify-content: flex-end; }

    .btn-primary {
        font-size: 0.85rem; font-weight: 600;
        color: #fff; background: #16a34a;
        border: none; border-radius: 0.5rem;
        padding: 0.45rem 1rem; cursor: pointer;
    }
    .btn-primary:hover:not(:disabled) { background: #15803d; }
    .btn-primary:disabled { background: #86efac; cursor: not-allowed; }

    .btn-secondary {
        font-size: 0.85rem; font-weight: 500;
        color: #475569; background: #f1f5f9;
        border: 1px solid #e2e8f0; border-radius: 0.5rem;
        padding: 0.45rem 0.9rem; cursor: pointer;
    }
    .btn-secondary:hover { background: #e2e8f0; }

    /* ── Filter pills ── */
    .filter-bar { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-bottom: 1rem; }

    .pill {
        font-size: 0.78rem; font-weight: 500;
        padding: 0.3rem 0.75rem;
        border: 1px solid #e2e8f0; border-radius: 999px;
        background: #f8fafc; color: #64748b;
        cursor: pointer; transition: all 0.15s;
    }
    .pill:hover  { background: #f1f5f9; color: #334155; }
    .pill.active { background: #0f172a; color: #fff; border-color: #0f172a; }

    /* ── Cards ── */
    .svc-list { display: flex; flex-direction: column; gap: 0.75rem; }

    .svc-card {
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 0.875rem;
        padding: 1rem 1.1rem;
    }

    .svc-badges { display: flex; gap: 0.4rem; margin-bottom: 0.5rem; flex-wrap: wrap; }

    .badge {
        display: inline-block;
        padding: 0.2rem 0.55rem;
        border-radius: 999px;
        font-size: 0.72rem;
        font-weight: 600;
    }

    .cat        { background: #e0f2fe; color: #0369a1; }
    .rate       { background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; }
    .avail-open { background: #dcfce7; color: #15803d; }
    .avail-busy { background: #fee2e2; color: #b91c1c; }
    .avail-appt { background: #fef9c3; color: #a16207; }

    .svc-name { font-size: 0.95rem; font-weight: 600; color: #0f172a; margin-bottom: 0.2rem; }
    .svc-meta { font-size: 0.78rem; color: #94a3b8; margin: 0 0 0.3rem; }
    .svc-desc { font-size: 0.875rem; color: #475569; margin: 0.2rem 0 0.3rem; line-height: 1.5; }

    .card-actions { display: flex; gap: 0.5rem; margin-top: 0.5rem; }

    .action-btn {
        font-size: 0.72rem; font-weight: 500;
        color: #64748b; background: none;
        border: 1px solid #e2e8f0; border-radius: 0.375rem;
        padding: 0.2rem 0.6rem; cursor: pointer;
    }
    .action-btn:hover        { background: #f8fafc; }
    .action-btn.danger       { color: #ef4444; border-color: #fecaca; }
    .action-btn.danger:hover { background: #fef2f2; }

    /* ── Message compose ── */
    .msg-compose { display: flex; flex-direction: column; gap: 0.5rem; margin-top: 0.5rem; }
    .msg-sent    { font-size: 0.85rem; color: #16a34a; font-weight: 500; margin: 0.5rem 0 0; }

    /* ── Pagination ── */
    .pagination {
        display: flex; align-items: center; justify-content: center;
        gap: 1rem; margin-top: 1.25rem;
    }
    .page-btn {
        font-size: 0.82rem; font-weight: 500;
        color: #475569; background: #f8fafc;
        border: 1px solid #e2e8f0; border-radius: 0.5rem;
        padding: 0.35rem 0.85rem; cursor: pointer;
    }
    .page-btn:hover:not(:disabled) { background: #f1f5f9; }
    .page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .page-info { font-size: 0.82rem; color: #64748b; }

    /* ── Misc ── */
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
        0%   { background-position: 200% 0; }
        100% { background-position: -200% 0; }
    }
</style>
