<script lang="ts">
    import {
        listClassifieds,
        listMyClassifieds,
        createClassified,
        updateClassified,
        cancelClassified,
        claimClassified,
        adminCancelClassified,
        sendMailMessage,
        type Classified,
        type ClassifiedCategory,
    } from "../lib/api.js";
    import { session, isCoordinator } from "../lib/session.js";

    const CATEGORIES: ClassifiedCategory[] = ["for-sale", "wanted", "free", "job", "notice"];
    const CATEGORY_LABELS: Record<ClassifiedCategory, string> = {
        "for-sale": "For Sale",
        "wanted":   "Wanted",
        "free":     "Free",
        "job":      "Jobs",
        "notice":   "Notices",
    };

    let items       = $state<Classified[]>([]);
    let myItems     = $state<Classified[]>([]);
    let loading     = $state(true);
    let error       = $state("");
    let filter      = $state<ClassifiedCategory | "all">("all");
    let tab         = $state<"board" | "mine">("board");
    let search      = $state("");

    // Debounce search → reload
    let searchTimeout: ReturnType<typeof setTimeout> | null = null;
    function onSearchInput() {
        if (searchTimeout) clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => load(1), 300);
    }

    // Pagination
    const PAGE_SIZE = 20;
    let page  = $state(1);
    let total = $state(0);
    let pages = $state(1);

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

    // Message compose
    let msgId      = $state<string | null>(null);   // classified id the compose pane is open for
    let msgBody    = $state("");
    let msgSending = $state(false);
    let msgError   = $state("");
    let msgSent    = $state(false);

    const myId = $derived($session?.personId);
    // server filters by category now; items is always the current page
    const filtered = $derived(items);

    function daysLeft(expiresAt: string): number {
        return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86_400_000));
    }

    function statusLabel(s: string): string {
        return s === "open" ? "Open" : s === "closed" ? "Fulfilled" : s === "cancelled" ? "Cancelled" : "Expired";
    }

    async function load(p = page) {
        loading = true;
        error   = "";
        try {
            const cat = filter === "all" ? undefined : filter;
            const result = await listClassifieds(cat, p, PAGE_SIZE, search || undefined);
            items = result.items;
            total = result.total;
            pages = result.pages;
            page  = result.page;
            if (myId) myItems = await listMyClassifieds();
        } catch {
            error = "Failed to load classifieds";
        } finally {
            loading = false;
        }
    }

    function goPage(p: number) { load(p); }

    $effect(() => { if (tab === "mine" && myId && myItems.length === 0) load(page); });
    load(1);

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
            items   = [created, ...items];
            myItems = [created, ...myItems];
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
            items   = items.map(c => c.id === id ? updated : c);
            myItems = myItems.map(c => c.id === id ? updated : c);
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
            items   = items.map(c => c.id === id ? updated : c);
            myItems = myItems.map(c => c.id === id ? updated : c);
        } catch {
            error = "Failed to cancel";
        }
    }

    async function handleAdminRemove(id: string) {
        if (!confirm("Remove this listing as coordinator? This cannot be undone.")) return;
        try {
            const updated = await adminCancelClassified(id);
            items   = items.map(c => c.id === id ? updated : c);
            myItems = myItems.map(c => c.id === id ? updated : c);
        } catch (e) {
            error = e instanceof Error ? e.message : "Failed to remove listing";
        }
    }

    function openMessage(c: Classified) {
        msgId    = c.id;
        msgBody  = "";
        msgError = "";
        msgSent  = false;
    }

    async function handleSendMessage(c: Classified) {
        if (!msgBody.trim()) return;
        msgSending = true; msgError = "";
        try {
            const action = c.category === "for-sale" ? "buy"
                         : c.category === "wanted"   ? "supply"
                         : c.category === "job"      ? "apply for"
                         : "respond to";
            const subject = `Re: ${c.title}`;
            const body    = `Hi ${c.posterHandle},\n\nI'd like to ${action} your classified "${c.title}".\n\n${msgBody.trim()}`;
            await sendMailMessage(c.posterId, subject, body);
            msgSent = true;
            setTimeout(() => { msgId = null; msgSent = false; }, 1500);
        } catch (e) {
            msgError = e instanceof Error ? e.message : "Failed to send";
        } finally {
            msgSending = false;
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
</script>

<div class="page">
    <div class="page-header">
        <div>
            <h2 class="page-title">Classifieds</h2>
            <p class="page-sub">Community board for buying, selling, and notices.</p>
        </div>
        {#if myId}
            <button class="btn-add" onclick={() => { showForm = !showForm; formError = ""; }}>
                {showForm ? "✕ Close" : "+ Post"}
            </button>
        {/if}
    </div>

    {#if showForm}
        <form class="cl-form" onsubmit={(e) => { e.preventDefault(); handleCreate(); }}>
            <h3 class="form-title">Post a Classified</h3>
            {#if formError}<p class="form-error">{formError}</p>{/if}

            <label class="field">
                <span class="field-label">Category</span>
                <select class="input" bind:value={newCategory}>
                    {#each CATEGORIES as cat}
                        <option value={cat}>{CATEGORY_LABELS[cat]}</option>
                    {/each}
                </select>
            </label>

            <label class="field">
                <span class="field-label">Title *</span>
                <input class="input" type="text" bind:value={newTitle} placeholder="Brief title" />
            </label>

            <label class="field">
                <span class="field-label">Description</span>
                <textarea class="input" bind:value={newDesc} rows="3" placeholder="Details..."></textarea>
            </label>

            {#if newCategory === "for-sale" || newCategory === "wanted"}
                <label class="field">
                    <span class="field-label">Price (leave blank for free / negotiable)</span>
                    <input class="input" type="number" min="0" step="0.01" bind:value={newPrice} placeholder="0.00" />
                </label>
            {/if}

            <div class="form-actions">
                <button class="btn-secondary" type="button" onclick={() => { showForm = false; formError = ""; }}>Cancel</button>
                <button class="btn-primary" type="submit" disabled={saving}>{saving ? "Posting…" : "Post"}</button>
            </div>
        </form>
    {/if}

    <!-- Tabs -->
    <div class="tab-bar">
        <button class="tab" class:active={tab === "board"} onclick={() => tab = "board"}>Board</button>
        {#if myId}
            <button class="tab" class:active={tab === "mine"} onclick={() => tab = "mine"}>My Posts</button>
        {/if}
    </div>

    {#if tab === "board"}
        <div class="filter-bar">
            <button class="pill" class:active={filter === "all"} onclick={() => { filter = "all"; load(1); }}>All</button>
            {#each CATEGORIES as cat}
                <button class="pill" class:active={filter === cat} onclick={() => { filter = cat; load(1); }}>{CATEGORY_LABELS[cat]}</button>
            {/each}
        </div>

        <div class="search-bar">
            <input
                class="search-input"
                type="search"
                placeholder="Search classifieds…"
                bind:value={search}
                oninput={onSearchInput}
            />
            {#if search}
                <button class="search-clear" onclick={() => { search = ""; load(1); }} aria-label="Clear search">✕</button>
            {/if}
        </div>

        {#if loading}
            <div class="skeleton"></div>
            <div class="skeleton short"></div>
            <div class="skeleton"></div>
        {:else if error}
            <p class="error-msg">{error}</p>
        {:else if filtered.length === 0}
            <p class="empty-msg">{search ? "No classifieds match your search." : "No classifieds in this category."}</p>
        {:else}
            <div class="cl-list">
                {#each filtered as c (c.id)}
                    <div class="cl-card">
                        <div class="cl-badges">
                            <span class="badge cat-{c.category}">{CATEGORY_LABELS[c.category]}</span>
                            {#if c.price > 0}<span class="badge price">{c.price.toFixed(2)} kin</span>{/if}
                        </div>
                        <div class="cl-title">{c.title}</div>
                        {#if c.description}<p class="cl-desc">{c.description}</p>{/if}
                        <p class="cl-meta">
                            Posted by {c.posterHandle || c.posterId}
                            · expires in {daysLeft(c.expiresAt)}d
                        </p>

                        {#if msgId === c.id}
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
                                        <button class="btn-primary" onclick={() => handleSendMessage(c)} disabled={msgSending || !msgBody.trim()}>
                                            {msgSending ? "Sending…" : "Send"}
                                        </button>
                                    </div>
                                </div>
                            {/if}
                        {:else}
                            <div class="card-actions">
                                {#if myId && myId !== c.posterId}
                                    <button class="btn-primary" onclick={() => openMessage(c)}>Message poster</button>
                                {/if}
                                {#if $isCoordinator && myId !== c.posterId}
                                    <button class="action-btn danger" onclick={() => handleAdminRemove(c.id)} title="Remove as coordinator">⚑ Remove</button>
                                {/if}
                            </div>
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

    {:else}
        <!-- My Posts tab -->
        {#if loading}
            <div class="skeleton"></div>
            <div class="skeleton short"></div>
        {:else if myItems.length === 0}
            <p class="empty-msg">You haven't posted anything yet.</p>
        {:else}
            <div class="cl-list">
                {#each myItems as c (c.id)}
                    <div class="cl-card" class:inactive={c.status !== "open"}>
                        {#if editId === c.id}
                            <label class="field">
                                <span class="field-label">Title *</span>
                                <input class="input" bind:value={editTitle} />
                            </label>
                            <label class="field">
                                <span class="field-label">Description</span>
                                <textarea class="input" bind:value={editDesc} rows="3"></textarea>
                            </label>
                            {#if c.category === "for-sale" || c.category === "wanted"}
                                <label class="field">
                                    <span class="field-label">Price</span>
                                    <input class="input" type="number" min="0" step="0.01" bind:value={editPrice} />
                                </label>
                            {/if}
                            {#if formError}<p class="form-error">{formError}</p>{/if}
                            <div class="form-actions">
                                <button class="btn-secondary" onclick={() => editId = null}>Cancel</button>
                                <button class="btn-primary" onclick={() => handleUpdate(c.id)} disabled={saving}>Save</button>
                            </div>
                        {:else}
                            <div class="cl-badges">
                                <span class="badge cat-{c.category}">{CATEGORY_LABELS[c.category]}</span>
                                {#if c.price > 0}<span class="badge price">{c.price.toFixed(2)} kin</span>{/if}
                                <span class="badge status-{c.status}">{statusLabel(c.status)}</span>
                            </div>
                            <div class="cl-title">{c.title}</div>
                            {#if c.description}<p class="cl-desc">{c.description}</p>{/if}
                            <p class="cl-meta">
                                Posted {new Date(c.createdAt).toLocaleDateString()}
                                {#if c.status === "open"}· expires in {daysLeft(c.expiresAt)}d{/if}
                            </p>
                            {#if c.status === "open"}
                                <div class="card-actions">
                                    <button class="action-btn" onclick={() => startEdit(c)}>Edit</button>
                                    <button class="action-btn danger" onclick={() => handleCancel(c.id)}>Cancel listing</button>
                                </div>
                            {/if}
                        {/if}
                    </div>
                {/each}
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
    .cl-form {
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
    .input:focus     { border-color: #3b82f6; }
    textarea.input   { resize: vertical; }

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

    /* ── Tabs ── */
    .tab-bar { display: flex; gap: 0; border-bottom: 1px solid #e2e8f0; margin-bottom: 1rem; }

    .tab {
        font-size: 0.85rem; font-weight: 500;
        padding: 0.5rem 1rem;
        border: none; background: none;
        color: #64748b; cursor: pointer;
        border-bottom: 2px solid transparent;
        margin-bottom: -1px;
        transition: color 0.15s, border-color 0.15s;
    }
    .tab:hover  { color: #334155; }
    .tab.active { color: #0f172a; border-bottom-color: #0f172a; font-weight: 600; }

    /* ── Search bar ── */
    .search-bar {
        position: relative;
        margin-bottom: 1rem;
    }
    .search-input {
        width: 100%;
        box-sizing: border-box;
        border: 1px solid #cbd5e1;
        border-radius: 0.5rem;
        padding: 0.5rem 2.25rem 0.5rem 0.75rem;
        font-size: 0.9rem;
        color: #0f172a;
        background: #fff;
        outline: none;
        font-family: inherit;
        transition: border-color 0.15s;
    }
    .search-input:focus { border-color: #3b82f6; }
    .search-clear {
        position: absolute;
        right: 0.5rem;
        top: 50%;
        transform: translateY(-50%);
        background: none;
        border: none;
        color: #94a3b8;
        font-size: 0.85rem;
        cursor: pointer;
        padding: 0.2rem 0.3rem;
        line-height: 1;
    }
    .search-clear:hover { color: #475569; }

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
    .cl-list { display: flex; flex-direction: column; gap: 0.75rem; }

    .cl-card {
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 0.875rem;
        padding: 1rem 1.1rem;
    }

    .cl-badges { display: flex; gap: 0.4rem; margin-bottom: 0.5rem; flex-wrap: wrap; }

    .badge {
        display: inline-block;
        padding: 0.2rem 0.55rem;
        border-radius: 999px;
        font-size: 0.72rem;
        font-weight: 600;
    }

    .cat-for-sale { background: #dcfce7; color: #15803d; }
    .cat-wanted   { background: #dbeafe; color: #1d4ed8; }
    .cat-free     { background: #f3e8ff; color: #7e22ce; }
    .cat-job      { background: #fef9c3; color: #a16207; }
    .cat-notice   { background: #fee2e2; color: #b91c1c; }
    .price        { background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; }

    .status-open      { background: #dcfce7; color: #15803d; }
    .status-closed    { background: #dbeafe; color: #1d4ed8; }
    .status-cancelled { background: #f1f5f9; color: #94a3b8; }
    .status-expired   { background: #fef9c3; color: #92400e; }

    .cl-card.inactive { opacity: 0.65; }

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

    .cl-title { font-size: 0.95rem; font-weight: 600; color: #0f172a; margin-bottom: 0.2rem; }
    .cl-desc  { font-size: 0.875rem; color: #475569; margin: 0.2rem 0 0.3rem; line-height: 1.5; }
    .cl-meta  { font-size: 0.78rem; color: #94a3b8; margin: 0 0 0.4rem; }

    .card-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 0.4rem; }

    .action-btn {
        font-size: 0.72rem; font-weight: 500;
        color: #64748b; background: none;
        border: 1px solid #e2e8f0; border-radius: 0.375rem;
        padding: 0.2rem 0.6rem; cursor: pointer;
    }
    .action-btn:hover        { background: #f8fafc; }
    .action-btn.danger       { color: #ef4444; border-color: #fecaca; }
    .action-btn.danger:hover { background: #fef2f2; }

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
