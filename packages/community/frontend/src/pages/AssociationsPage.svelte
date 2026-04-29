<script lang="ts">
    import { listAssociations, createAssociation } from "../lib/api.js";
    import type { AssociationDto } from "../lib/api.js";
    import { currentPage, selectedAssociationId } from "../lib/session.js";

    let associations: AssociationDto[] = $state([]);
    let loading = $state(true);
    let error   = $state("");

    // Create form
    let showCreate = $state(false);
    let creating   = $state(false);
    let createError = $state("");
    let form = $state({ name: "", handle: "", description: "" });

    async function load() {
        loading = true;
        error = "";
        try {
            associations = (await listAssociations()).sort((a, b) => a.name.localeCompare(b.name));
        } catch (e) {
            error = e instanceof Error ? e.message : "Failed to load";
        } finally {
            loading = false;
        }
    }

    $effect(() => { load(); });

    function autoHandle() {
        if (!form.handle) {
            form.handle = form.name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
        }
    }

    async function submit() {
        createError = "";
        if (!form.name.trim() || !form.handle.trim()) {
            createError = "Name and handle are required."; return;
        }
        creating = true;
        try {
            const a = await createAssociation({ name: form.name.trim(), handle: form.handle.trim(), description: form.description.trim() });
            associations = [...associations, a].sort((a, b) => a.name.localeCompare(b.name));
            showCreate = false;
            form = { name: "", handle: "", description: "" };
        } catch (e) {
            createError = e instanceof Error ? e.message : "Failed to create";
        } finally {
            creating = false;
        }
    }

    function open(id: string) {
        selectedAssociationId.set(id);
        currentPage.go("association");
    }
</script>

<div class="page">
    <div class="page-header">
        <div>
            <h2 class="page-title">Associations</h2>
            <p class="page-subtitle">Businesses, churches, cooperatives, and clubs within this community.</p>
        </div>
        <button class="new-btn" onclick={() => { showCreate = !showCreate; createError = ""; }}>
            {showCreate ? "✕" : "+ New"}
        </button>
    </div>

    {#if showCreate}
        <form class="create-form" onsubmit={(e) => { e.preventDefault(); submit(); }}>
            <h3 class="form-title">Register an association</h3>

            <div class="field">
                <label for="name">Name</label>
                <input id="name" type="text" bind:value={form.name} onblur={autoHandle} placeholder="First Baptist Church" />
            </div>

            <div class="field">
                <label for="handle">Handle <span class="field-hint">unique, letters/numbers/underscores</span></label>
                <input id="handle" type="text" bind:value={form.handle} placeholder="first_baptist" autocapitalize="none" />
            </div>

            <div class="field">
                <label for="desc">Description <span class="field-hint">optional</span></label>
                <textarea id="desc" bind:value={form.description} rows="2" placeholder="What does this association do?"></textarea>
            </div>

            {#if createError}
                <p class="form-error">{createError}</p>
            {/if}

            <button class="submit-btn" type="submit" disabled={creating}>
                {creating ? "Registering…" : "Register"}
            </button>
        </form>
    {/if}

    {#if loading && associations.length === 0}
        <div class="skeleton"></div>
        <div class="skeleton short"></div>
        <div class="skeleton"></div>
    {:else if error}
        <div class="error-msg">{error}</div>
    {:else if associations.length === 0}
        <div class="empty-msg">No associations yet. Register the first one above.</div>
    {:else}
        <div class="list">
            {#each associations as a (a.id)}
                <button class="card" onclick={() => open(a.id)}>
                    <div class="card-left">
                        <div class="avatar">{a.name[0]}</div>
                        <div class="card-text">
                            <span class="card-name">{a.name}</span>
                            <span class="card-handle">@{a.handle}</span>
                            {#if a.description}
                                <span class="card-desc">{a.description}</span>
                            {/if}
                        </div>
                    </div>
                    <div class="card-right">
                        <span class="member-count">{a.memberCount} member{a.memberCount !== 1 ? "s" : ""}</span>
                        <span class="chevron">›</span>
                    </div>
                </button>
            {/each}
        </div>
        <p class="count">{associations.length} association{associations.length !== 1 ? "s" : ""}</p>
    {/if}
</div>

<style>
    .page {
        padding: 1.5rem 1.5rem 6rem;
        max-width: 560px;
        margin: 0 auto;
    }

    .page-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 1rem;
        margin-bottom: 1.25rem;
    }

    .page-title { margin-bottom: 0.2rem; }
    .page-subtitle { font-size: 0.82rem; color: #64748b; margin: 0; }

    .new-btn {
        background: #0f172a;
        color: #fff;
        border: none;
        border-radius: 10px;
        padding: 0.5rem 1rem;
        font-size: 0.85rem;
        font-weight: 600;
        cursor: pointer;
        white-space: nowrap;
        flex-shrink: 0;
    }

    /* Create form */
    .create-form {
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 18px;
        padding: 1.25rem;
        margin-bottom: 1.25rem;
    }
    .form-title { font-size: 0.95rem; font-weight: 700; color: #0f172a; margin: 0 0 1rem; }

    .field { margin-bottom: 0.85rem; }
    .field label {
        display: block;
        font-size: 0.8rem;
        font-weight: 600;
        color: #475569;
        margin-bottom: 0.3rem;
    }
    .field-hint { font-weight: 400; color: #94a3b8; }

    .field input,
    .field textarea {
        width: 100%;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        padding: 0.6rem 0.85rem;
        font-size: 0.9rem;
        color: #0f172a;
        background: #f8fafc;
        box-sizing: border-box;
        resize: vertical;
    }
    .field input:focus,
    .field textarea:focus {
        outline: none;
        border-color: #94a3b8;
        background: #fff;
    }

    .form-error { font-size: 0.82rem; color: #dc2626; margin: 0 0 0.75rem; }

    .submit-btn {
        width: 100%;
        background: #15803d;
        color: #fff;
        border: none;
        border-radius: 12px;
        padding: 0.7rem;
        font-size: 0.9rem;
        font-weight: 600;
        cursor: pointer;
    }
    .submit-btn:disabled { opacity: 0.5; }

    /* Skeleton */
    .skeleton {
        background: #e2e8f0;
        border-radius: 14px;
        height: 5rem;
        margin-bottom: 0.65rem;
        animation: pulse 1.4s ease-in-out infinite;
    }
    .skeleton.short { height: 3.5rem; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }

    .error-msg, .empty-msg {
        text-align: center;
        color: #94a3b8;
        padding: 3rem 0;
        font-size: 0.9rem;
    }

    /* List */
    .list { display: flex; flex-direction: column; gap: 0.5rem; }

    .card {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 16px;
        padding: 0.9rem 1.1rem;
        cursor: pointer;
        text-align: left;
        transition: box-shadow 0.15s, border-color 0.15s;
    }
    .card:hover { box-shadow: 0 2px 10px rgba(0,0,0,0.06); border-color: #cbd5e1; }

    .card-left { display: flex; align-items: center; gap: 0.85rem; min-width: 0; }

    .avatar {
        width: 2.6rem;
        height: 2.6rem;
        border-radius: 10px;
        background: #dbeafe;
        color: #1d4ed8;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.1rem;
        font-weight: 700;
        flex-shrink: 0;
        text-transform: uppercase;
    }

    .card-text { display: flex; flex-direction: column; min-width: 0; gap: 0.1rem; }
    .card-name   { font-size: 0.92rem; font-weight: 700; color: #0f172a; }
    .card-handle { font-size: 0.76rem; color: #94a3b8; }
    .card-desc   { font-size: 0.78rem; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    .card-right { display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0; }
    .member-count { font-size: 0.78rem; color: #94a3b8; }
    .chevron { font-size: 1.3rem; color: #cbd5e1; line-height: 1; }

    .count { text-align: center; font-size: 0.8rem; color: #94a3b8; margin-top: 1rem; }

    @media (min-width: 768px) {
        .page { padding-bottom: 2rem; }
    }
</style>
