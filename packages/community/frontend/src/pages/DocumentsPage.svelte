<script lang="ts">
    import { getConstitution, listBylaws, createBylaw, deleteBylaw } from "../lib/api.js";
    import type { ConstitutionDocument, BylawDto } from "../lib/api.js";
    import { currentPage, session, selectedBylawId } from "../lib/session.js";

    const isSteward = $derived($session?.isSteward ?? false);

    let constitution: ConstitutionDocument | null = $state(null);
    let bylaws: BylawDto[] = $state([]);
    let loading = $state(true);
    let error   = $state("");

    async function load() {
        loading = true; error = "";
        try {
            [constitution, bylaws] = await Promise.all([getConstitution(), listBylaws()]);
        } catch (e) {
            error = e instanceof Error ? e.message : "Failed to load documents";
        } finally {
            loading = false;
        }
    }

    $effect(() => { load(); });

    // ── New bylaw form ────────────────────────────────────────────────────────
    let showForm    = $state(false);
    let newTitle    = $state("");
    let newPreamble = $state("");
    let creating    = $state(false);
    let createError = $state("");

    async function submitCreate() {
        createError = "";
        if (!newTitle.trim()) { createError = "Title is required."; return; }
        creating = true;
        try {
            const bylaw = await createBylaw(newTitle.trim(), newPreamble.trim() || undefined);
            bylaws = [...bylaws, bylaw];
            showForm = false; newTitle = ""; newPreamble = "";
        } catch (e) {
            createError = e instanceof Error ? e.message : "Failed to create bylaw";
        } finally {
            creating = false;
        }
    }

    async function handleDelete(bylaw: BylawDto, e: MouseEvent) {
        e.stopPropagation();
        if (!confirm(`Delete "${bylaw.title}"? This cannot be undone.`)) return;
        try {
            await deleteBylaw(bylaw.id);
            bylaws = bylaws.filter(b => b.id !== bylaw.id);
        } catch { /* ignore */ }
    }

    function openConstitution() {
        currentPage.go("constitution");
    }

    function openBylaw(bylaw: BylawDto) {
        selectedBylawId.set(bylaw.id);
        currentPage.go("bylaw");
    }

    function formatDate(iso: string): string {
        return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
    }
</script>

<div class="docs-page">
    <div class="page-header">
        <h2 class="page-title">Governing Documents</h2>
        {#if isSteward && !showForm}
            <button class="new-btn" onclick={() => showForm = true}>+ New Bylaw</button>
        {/if}
    </div>

    {#if loading}
        <div class="state-msg">Loading…</div>
    {:else if error}
        <div class="error-banner">{error}</div>
    {:else}

        <!-- Constitution card -->
        {#if constitution}
            <div class="section-label">Constitution</div>
            <button class="doc-card" onclick={openConstitution}>
                <div class="doc-card-body">
                    <div class="doc-title">Constitution of {constitution.communityName}</div>
                    <div class="doc-meta">
                        Version {constitution.version} · Adopted {formatDate(constitution.adoptedAt)}
                        {#if constitution.amendments.length > 0}
                            · {constitution.amendments.length} amendment{constitution.amendments.length !== 1 ? "s" : ""}
                        {/if}
                    </div>
                    {#if constitution.articles.length > 0}
                        <div class="doc-toc">{constitution.articles.length} article{constitution.articles.length !== 1 ? "s" : ""}</div>
                    {/if}
                </div>
                <span class="doc-arrow">›</span>
            </button>
        {/if}

        <!-- Bylaws -->
        <div class="section-label" style="margin-top: 1.5rem">
            Bylaws
            {#if bylaws.length > 0}
                <span class="section-count">{bylaws.length}</span>
            {/if}
        </div>

        {#if showForm}
            <div class="new-form">
                <label class="field">
                    <span>Title</span>
                    <input type="text" bind:value={newTitle} placeholder="e.g. Membership Bylaw" disabled={creating} />
                </label>
                <label class="field">
                    <span>Preamble <small>(optional)</small></span>
                    <textarea rows={3} bind:value={newPreamble} placeholder="Introductory text…" disabled={creating}></textarea>
                </label>
                {#if createError}<p class="field-error">{createError}</p>{/if}
                <div class="form-actions">
                    <button class="btn-primary" onclick={submitCreate} disabled={creating || !newTitle.trim()}>
                        {creating ? "Creating…" : "Create Bylaw"}
                    </button>
                    <button class="btn-cancel" onclick={() => { showForm = false; createError = ""; }} disabled={creating}>Cancel</button>
                </div>
            </div>
        {/if}

        {#if bylaws.length === 0 && !showForm}
            <div class="empty-state">No bylaws have been adopted yet.</div>
        {:else}
            <ul class="doc-list">
                {#each bylaws as bylaw (bylaw.id)}
                    <li class="doc-card" onclick={() => openBylaw(bylaw)}>
                        <div class="doc-card-body">
                            <div class="doc-title">{bylaw.title}</div>
                            <div class="doc-meta">
                                Version {bylaw.version} · Adopted {formatDate(bylaw.adoptedAt)}
                            </div>
                            {#if bylaw.articles.length > 0}
                                <div class="doc-toc">{bylaw.articles.length} article{bylaw.articles.length !== 1 ? "s" : ""}</div>
                            {:else}
                                <div class="doc-toc empty">No articles yet</div>
                            {/if}
                        </div>
                        <div class="doc-card-actions">
                            {#if isSteward}
                                <button class="delete-btn" title="Delete bylaw" onclick={(e) => handleDelete(bylaw, e)}>✕</button>
                            {/if}
                            <span class="doc-arrow">›</span>
                        </div>
                    </li>
                {/each}
            </ul>
        {/if}
    {/if}
</div>

<style>
    .docs-page {
        padding: 1.5rem 1.5rem 6rem;
        max-width: 640px;
        margin: 0 auto;
    }

    @media (min-width: 768px) {
        .docs-page { padding-bottom: 2rem; }
    }

    .page-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 1.25rem;
    }

    .page-title { margin: 0; font-size: 1.2rem; font-weight: 700; color: #0f172a; }

    .new-btn {
        background: #16a34a;
        color: #fff;
        border: none;
        border-radius: 8px;
        padding: 0.5rem 1rem;
        font-size: 0.875rem;
        font-weight: 600;
        cursor: pointer;
    }
    .new-btn:hover { background: #15803d; }

    .section-label {
        font-size: 0.78rem;
        font-weight: 700;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.07em;
        margin-bottom: 0.5rem;
        display: flex;
        align-items: center;
        gap: 0.4rem;
    }

    .section-count {
        background: #e2e8f0;
        color: #475569;
        border-radius: 999px;
        padding: 0 0.45rem;
        font-size: 0.75rem;
        font-weight: 600;
    }

    .doc-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.5rem; }

    .doc-card {
        display: flex;
        align-items: center;
        width: 100%;
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 14px;
        padding: 1rem 1.1rem;
        cursor: pointer;
        text-align: left;
        transition: border-color 0.15s, box-shadow 0.15s;
        margin-bottom: 0.5rem;
        gap: 0.75rem;
    }

    .doc-card:hover { border-color: #86efac; box-shadow: 0 0 0 3px #dcfce7; }

    .doc-card-body { flex: 1; min-width: 0; }

    .doc-title { font-size: 1rem; font-weight: 600; color: #0f172a; margin-bottom: 0.2rem; }
    .doc-meta  { font-size: 0.8rem; color: #64748b; margin-bottom: 0.2rem; }
    .doc-toc   { font-size: 0.78rem; color: #94a3b8; }
    .doc-toc.empty { font-style: italic; }

    .doc-card-actions { display: flex; align-items: center; gap: 0.4rem; }

    .doc-arrow { font-size: 1.3rem; color: #94a3b8; flex-shrink: 0; }

    .delete-btn {
        background: none;
        border: none;
        cursor: pointer;
        color: #f87171;
        font-size: 0.85rem;
        padding: 0.25rem 0.4rem;
        border-radius: 6px;
        opacity: 0;
        transition: opacity 0.1s, background 0.1s;
    }
    .doc-card:hover .delete-btn { opacity: 1; }
    .delete-btn:hover { background: #fef2f2; }

    /* New bylaw form */
    .new-form {
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 14px;
        padding: 1.25rem;
        margin-bottom: 1rem;
        display: flex;
        flex-direction: column;
        gap: 0.85rem;
    }

    .field { display: flex; flex-direction: column; gap: 0.35rem; }
    .field span { font-size: 0.85rem; font-weight: 500; color: #374151; }
    .field small { font-weight: 400; opacity: 0.6; }

    .field input,
    .field textarea {
        border: 1px solid #cbd5e1;
        border-radius: 10px;
        font-size: 0.95rem;
        padding: 0.65rem 0.9rem;
        outline: none;
        resize: vertical;
        font-family: inherit;
        transition: border-color 0.15s;
    }
    .field input:focus, .field textarea:focus { border-color: #16a34a; }

    .field-error { font-size: 0.82rem; color: #dc2626; margin: 0; }

    .form-actions { display: flex; gap: 0.75rem; align-items: center; }

    .btn-primary {
        padding: 0.7rem 1.5rem;
        background: #16a34a;
        color: #fff;
        border: none;
        border-radius: 10px;
        font-size: 0.95rem;
        font-weight: 600;
        cursor: pointer;
    }
    .btn-primary:disabled { background: #86efac; cursor: default; }
    .btn-primary:not(:disabled):hover { background: #15803d; }

    .btn-cancel {
        padding: 0.7rem 1rem;
        background: none;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        font-size: 0.9rem;
        cursor: pointer;
        color: #64748b;
    }

    .empty-state { padding: 3rem 0; text-align: center; color: #94a3b8; font-size: 0.9rem; }
    .state-msg   { padding: 3rem 0; text-align: center; color: #94a3b8; }
    .error-banner { background: #fee; border: 1px solid #fcc; border-radius: 10px; padding: 0.75rem 1rem; color: #c00; }
</style>
