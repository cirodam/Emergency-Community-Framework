<script lang="ts">
    import { getAssociation, listPersons, addAssociationMember, removeAssociationMember, addAssociationAdmin, removeAssociationAdmin, updateAssociation } from "../lib/api.js";
    import type { AssociationDto, PersonDto } from "../lib/api.js";
    import { session, currentPage, selectedAssociationId } from "../lib/session.js";

    let assoc:   AssociationDto | null = $state(null);
    let members: PersonDto[]           = $state([]);
    let allPersons: PersonDto[]        = $state([]);
    let loading = $state(true);
    let error   = $state("");

    // Add-member form
    let addHandle = $state("");
    let addError    = $state("");
    let adding      = $state(false);

    // Edit form
    let editing     = $state(false);
    let editName    = $state("");
    let editDesc    = $state("");
    let editError   = $state("");
    let saving      = $state(false);

    const myHandle = $derived($session?.handle ?? "");
    const isAdmin = $derived(assoc?.adminHandles.includes(myHandle) ?? false);

    async function load(id: string) {
        loading = true;
        error = "";
        try {
            const [a, persons] = await Promise.all([getAssociation(id), listPersons()]);
            assoc      = a;
            allPersons = persons;
            members    = persons.filter(p => a.memberHandles.includes(p.handle));
        } catch (e) {
            error = e instanceof Error ? e.message : "Failed to load";
        } finally {
            loading = false;
        }
    }

    $effect(() => {
        const id = $selectedAssociationId;
        if (id) load(id);
    });

    // Non-member persons available to add
    const nonMembers = $derived(
        assoc ? allPersons.filter(p => !assoc!.memberHandles.includes(p.handle)) : []
    );

    async function doAddMember() {
        if (!assoc || !addHandle) return;
        adding   = true;
        addError = "";
        try {
            assoc   = await addAssociationMember(assoc.id, addHandle);
            members = allPersons.filter(p => assoc!.memberHandles.includes(p.handle));
            addHandle = "";
        } catch (e) {
            addError = e instanceof Error ? e.message : "Failed to add member";
        } finally {
            adding = false;
        }
    }

    async function doRemoveMember(handle: string) {
        if (!assoc) return;
        try {
            assoc   = await removeAssociationMember(assoc.id, handle);
            members = allPersons.filter(p => assoc!.memberHandles.includes(p.handle));
        } catch (e) {
            error = e instanceof Error ? e.message : "Failed to remove member";
        }
    }

    async function doPromoteAdmin(handle: string) {
        if (!assoc) return;
        try {
            assoc = await addAssociationAdmin(assoc.id, handle);
        } catch (e) {
            error = e instanceof Error ? e.message : "Failed to promote";
        }
    }

    async function doDemoteAdmin(handle: string) {
        if (!assoc) return;
        try {
            assoc = await removeAssociationAdmin(assoc.id, handle);
        } catch (e) {
            error = e instanceof Error ? e.message : "Failed to demote";
        }
    }

    function startEdit() {
        editName  = assoc?.name        ?? "";
        editDesc  = assoc?.description ?? "";
        editError = "";
        editing   = true;
    }

    async function saveEdit() {
        if (!assoc) return;
        saving = true;
        editError = "";
        try {
            assoc   = await updateAssociation(assoc.id, { name: editName.trim(), description: editDesc.trim() });
            editing = false;
        } catch (e) {
            editError = e instanceof Error ? e.message : "Failed to save";
        } finally {
            saving = false;
        }
    }
</script>

<div class="page">
    <div class="top-bar">
        <button class="back-btn" onclick={() => currentPage.go("associations")}>← Associations</button>
        {#if assoc && isAdmin}
            <button class="edit-btn" onclick={startEdit}>Edit</button>
        {/if}
    </div>

    {#if loading && !assoc}
        <div class="skeleton tall"></div>
    {:else if error}
        <div class="error-msg">{error}</div>
    {:else if assoc}

        <!-- Hero -->
        {#if editing}
            <div class="edit-card">
                <div class="field">
                    <label for="edit-name">Name</label>
                    <input id="edit-name" type="text" bind:value={editName} />
                </div>
                <div class="field">
                    <label for="edit-desc">Description</label>
                    <textarea id="edit-desc" bind:value={editDesc} rows="3"></textarea>
                </div>
                {#if editError}<p class="form-error">{editError}</p>{/if}
                <div class="edit-actions">
                    <button class="save-btn" onclick={saveEdit} disabled={saving}>{saving ? "Saving…" : "Save"}</button>
                    <button class="cancel-btn" onclick={() => editing = false}>Cancel</button>
                </div>
            </div>
        {:else}
            <div class="hero">
                <div class="hero-avatar">{assoc.name[0]}</div>
                <div>
                    <h2 class="hero-name">{assoc.name}</h2>
                    <p class="hero-handle">{assoc.handle}</p>
                    {#if assoc.description}
                        <p class="hero-desc">{assoc.description}</p>
                    {/if}
                </div>
            </div>
        {/if}

        <!-- Roster -->
        <section class="section">
            <h3 class="section-heading">
                Members <span class="section-count">{assoc.memberCount}</span>
            </h3>

            {#if isAdmin}
                <div class="add-row">
                    <select bind:value={addHandle} class="add-select">
                        <option value="">Add a member…</option>
                        {#each nonMembers as p (p.handle)}
                            <option value={p.handle}>{p.firstName} {p.lastName} (@{p.handle})</option>
                        {/each}
                    </select>
                    <button class="add-btn" onclick={doAddMember} disabled={!addHandle || adding}>
                        {adding ? "…" : "Add"}
                    </button>
                </div>
                {#if addError}<p class="form-error">{addError}</p>{/if}
            {/if}

            {#if members.length === 0}
                <p class="empty">No members yet.</p>
            {:else}
                <ul class="member-list">
                    {#each members as m (m.handle)}
                        {@const memberIsAdmin = assoc.adminHandles.includes(m.handle)}
                        <li class="member-row">
                            <div class="member-left">
                                <div class="mini-avatar">{m.firstName[0]}{m.lastName[0]}</div>
                                <div class="member-info">
                                    <span class="member-name">{m.firstName} {m.lastName}</span>
                                    <span class="member-handle">{m.handle}</span>
                                </div>
                                {#if memberIsAdmin}
                                    <span class="admin-badge">admin</span>
                                {/if}
                            </div>
                            {#if isAdmin}
                                <div class="member-actions">
                                    {#if memberIsAdmin}
                                        {#if assoc.adminHandles.length > 1}
                                            <button class="action-link" onclick={() => doDemoteAdmin(m.handle)}>Remove admin</button>
                                        {/if}
                                    {:else}
                                        <button class="action-link" onclick={() => doPromoteAdmin(m.handle)}>Make admin</button>
                                    {/if}
                                    {#if m.handle !== myHandle}
                                        <button class="action-link danger" onclick={() => doRemoveMember(m.handle)}>Remove</button>
                                    {/if}
                                </div>
                            {/if}
                        </li>
                    {/each}
                </ul>
            {/if}
        </section>

    {/if}
</div>

<style>
    .page {
        padding: 1.25rem 1.5rem 6rem;
        max-width: 560px;
        margin: 0 auto;
    }

    .top-bar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.25rem;
    }
    .back-btn {
        background: none;
        border: none;
        font-size: 0.9rem;
        color: #64748b;
        cursor: pointer;
        padding: 0;
    }
    .edit-btn {
        background: none;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        font-size: 0.8rem;
        color: #475569;
        padding: 0.3rem 0.75rem;
        cursor: pointer;
    }

    /* Hero */
    .hero {
        display: flex;
        align-items: flex-start;
        gap: 1rem;
        margin-bottom: 1.75rem;
    }
    .hero-avatar {
        width: 3.5rem;
        height: 3.5rem;
        border-radius: 14px;
        background: #dbeafe;
        color: #1d4ed8;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.5rem;
        font-weight: 700;
        flex-shrink: 0;
        text-transform: uppercase;
    }
    .hero-name   { font-size: 1.3rem; font-weight: 800; color: #0f172a; margin: 0 0 0.1rem; }
    .hero-handle { font-size: 0.82rem; color: #94a3b8; margin: 0 0 0.4rem; }
    .hero-desc   { font-size: 0.85rem; color: #475569; margin: 0; line-height: 1.5; }

    /* Edit card */
    .edit-card {
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 18px;
        padding: 1.25rem;
        margin-bottom: 1.5rem;
    }
    .field { margin-bottom: 0.85rem; }
    .field label { display: block; font-size: 0.8rem; font-weight: 600; color: #475569; margin-bottom: 0.3rem; }
    .field input, .field textarea {
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
    .field input:focus, .field textarea:focus { outline: none; border-color: #94a3b8; background: #fff; }
    .form-error { font-size: 0.82rem; color: #dc2626; margin: 0 0 0.5rem; }
    .edit-actions { display: flex; gap: 0.5rem; }
    .save-btn   { flex: 1; background: #15803d; color: #fff; border: none; border-radius: 10px; padding: 0.6rem; font-size: 0.88rem; font-weight: 600; cursor: pointer; }
    .save-btn:disabled { opacity: 0.5; }
    .cancel-btn { flex: 1; background: #f1f5f9; color: #475569; border: none; border-radius: 10px; padding: 0.6rem; font-size: 0.88rem; font-weight: 600; cursor: pointer; }

    /* Section */
    .section { margin-bottom: 1.75rem; }
    .section-heading {
        font-size: 0.78rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.07em;
        color: #94a3b8;
        margin: 0 0 0.75rem;
        display: flex;
        align-items: center;
        gap: 0.4rem;
    }
    .section-count {
        background: #f1f5f9;
        color: #64748b;
        border-radius: 99px;
        padding: 0.05rem 0.45rem;
        font-size: 0.76rem;
        font-weight: 600;
        text-transform: none;
        letter-spacing: 0;
    }

    /* Add row */
    .add-row {
        display: flex;
        gap: 0.5rem;
        margin-bottom: 0.75rem;
    }
    .add-select {
        flex: 1;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        padding: 0.55rem 0.75rem;
        font-size: 0.85rem;
        color: #0f172a;
        background: #f8fafc;
        min-width: 0;
    }
    .add-btn {
        background: #0f172a;
        color: #fff;
        border: none;
        border-radius: 10px;
        padding: 0.55rem 1rem;
        font-size: 0.85rem;
        font-weight: 600;
        cursor: pointer;
        white-space: nowrap;
    }
    .add-btn:disabled { opacity: 0.5; }

    /* Member list */
    .member-list {
        list-style: none;
        margin: 0;
        padding: 0;
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 16px;
        overflow: hidden;
    }
    .member-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.75rem 1rem;
        border-bottom: 1px solid #f1f5f9;
        gap: 0.5rem;
    }
    .member-row:last-child { border-bottom: none; }

    .member-left { display: flex; align-items: center; gap: 0.65rem; min-width: 0; }

    .mini-avatar {
        width: 2rem;
        height: 2rem;
        border-radius: 8px;
        background: #f1f5f9;
        color: #475569;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.72rem;
        font-weight: 700;
        flex-shrink: 0;
        text-transform: uppercase;
    }
    .member-info { display: flex; flex-direction: column; min-width: 0; }
    .member-name   { font-size: 0.875rem; font-weight: 600; color: #0f172a; }
    .member-handle { font-size: 0.74rem; color: #94a3b8; }

    .admin-badge {
        font-size: 0.68rem;
        background: #dbeafe;
        color: #1d4ed8;
        border-radius: 4px;
        padding: 0.1rem 0.4rem;
        font-weight: 600;
        white-space: nowrap;
    }

    .member-actions { display: flex; gap: 0.5rem; flex-shrink: 0; }
    .action-link {
        background: none;
        border: none;
        font-size: 0.75rem;
        color: #64748b;
        cursor: pointer;
        padding: 0.2rem 0.4rem;
        border-radius: 5px;
    }
    .action-link:hover { background: #f1f5f9; }
    .action-link.danger { color: #dc2626; }
    .action-link.danger:hover { background: #fef2f2; }

    /* Misc */
    .skeleton { background: #e2e8f0; border-radius: 16px; animation: pulse 1.4s ease-in-out infinite; }
    .skeleton.tall { height: 12rem; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }

    .error-msg, .empty { text-align: center; color: #94a3b8; font-size: 0.88rem; padding: 1.5rem 0; }

    @media (min-width: 768px) { .page { padding-bottom: 2rem; } }
</style>
