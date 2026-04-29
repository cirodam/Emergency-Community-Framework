<script lang="ts">
    import { listPersons, setPassword, grantSteward, revokeSteward } from "../lib/api.js";
    import type { PersonDto } from "../lib/api.js";
    import { session, currentPage } from "../lib/session.js";

    let members: PersonDto[] = $state([]);
    let loading = $state(true);
    let error = $state("");
    let query = $state("");

    // ── Expand / reset state ───────────────────────────────────────────────────
    let expandedId: string | null = $state(null);
    let newPass    = $state("");
    let resetError = $state("");
    let resetOk    = $state(false);
    let resetting  = $state(false);
    let stewardError = $state("");
    let stewardWorking = $state(false);

    async function load() {
        loading = true;
        error = "";
        try {
            members = (await listPersons()).sort((a, b) =>
                a.handle.localeCompare(b.handle)
            );
        } catch (e) {
            error = e instanceof Error ? e.message : "Failed to load directory";
        } finally {
            loading = false;
        }
    }

    $effect(() => { load(); });

    const filtered = $derived(
        query.trim()
            ? members.filter(m =>
                m.handle.includes(query.toLowerCase()) ||
                `${m.firstName} ${m.lastName}`.toLowerCase().includes(query.toLowerCase())
              )
            : members
    );

    function toggleExpand(id: string) {
        expandedId = expandedId === id ? null : id;
        newPass    = "";
        resetError = "";
        resetOk    = false;
        stewardError = "";
    }

    async function doResetPassword(personId: string) {
        if (newPass.length < 8) { resetError = "Password must be at least 8 characters"; return; }
        resetting = true; resetError = ""; resetOk = false;
        try {
            await setPassword(personId, newPass);
            resetOk = true;
            newPass = "";
        } catch (e) {
            resetError = e instanceof Error ? e.message : "Failed to reset password";
        } finally {
            resetting = false;
        }
    }

    async function doGrantSteward(personId: string) {
        stewardWorking = true; stewardError = "";
        try {
            const updated = await grantSteward(personId);
            members = members.map(m => m.id === personId ? updated : m);
        } catch (e) {
            stewardError = e instanceof Error ? e.message : "Failed to grant stewardship";
        } finally {
            stewardWorking = false;
        }
    }

    async function doRevokeSteward(personId: string) {
        stewardWorking = true; stewardError = "";
        try {
            const updated = await revokeSteward(personId);
            members = members.map(m => m.id === personId ? updated : m);
        } catch (e) {
            stewardError = e instanceof Error ? e.message : "Failed to revoke stewardship";
        } finally {
            stewardWorking = false;
        }
    }
</script>

<div class="directory-page">
    <div class="page-header">
        <h2 class="page-title">Directory</h2>
        <button class="btn-add" onclick={() => currentPage.go("add-person")}>+ Add</button>
    </div>

    <div class="search-row">
        <input
            type="search"
            bind:value={query}
            placeholder="Search by name or handle…"
            autocomplete="off"
            autocapitalize="none"
        />
    </div>

    {#if loading}
        <div class="loading-msg">Loading…</div>
    {:else if error}
        <div class="loading-msg">{error}</div>
    {:else if filtered.length === 0}
        <div class="loading-msg">No members found.</div>
    {:else}
        <div class="member-list">
            {#each filtered as m (m.id)}
                <div class="member-card" class:expanded={expandedId === m.id}>
                    <button class="member-row" onclick={() => toggleExpand(m.id)}>
                        <div class="member-avatar">{m.firstName[0]}{m.lastName[0]}</div>
                        <div class="member-info">
                            <span class="member-name">{m.firstName} {m.lastName}</span>
                            <span class="member-handle">@{m.handle}</span>
                        </div>
                        {#if m.isSteward}
                            <span class="badge steward">Steward</span>
                        {/if}
                        {#if m.retired}
                            <span class="badge retired">Retired</span>
                        {:else if m.disabled}
                            <span class="badge exempt">Exempt</span>
                        {/if}
                        <span class="chevron">{expandedId === m.id ? "▲" : "▼"}</span>
                    </button>

                    {#if expandedId === m.id}
                        <div class="member-detail">
                            {#if m.phone}
                                <p class="detail-phone">📞 {m.phone}</p>
                            {/if}
                            {#if $session?.isSteward}
                                <div class="reset-section">
                                    <p class="reset-label">Reset password</p>
                                    <div class="reset-row">
                                        <input
                                            type="password"
                                            bind:value={newPass}
                                            placeholder="New password (min 8 chars)"
                                            autocomplete="new-password"
                                            disabled={resetting}
                                            onkeydown={(e) => e.key === "Enter" && doResetPassword(m.id)}
                                        />
                                        <button
                                            class="btn-reset"
                                            onclick={() => doResetPassword(m.id)}
                                            disabled={resetting || newPass.length < 8}
                                        >
                                            {resetting ? "…" : "Set"}
                                        </button>
                                    </div>
                                    {#if resetError}<p class="reset-error">{resetError}</p>{/if}
                                    {#if resetOk}<p class="reset-ok">Password reset ✓</p>{/if}
                                </div>
                                <div class="steward-section">
                                    {#if stewardError}<p class="reset-error">{stewardError}</p>{/if}
                                    {#if m.steward}
                                        <button
                                            class="btn-steward-revoke"
                                            onclick={() => doRevokeSteward(m.id)}
                                            disabled={stewardWorking}
                                        >
                                            {stewardWorking ? "…" : "Remove steward grant"}
                                        </button>
                                        {#if !m.isSteward}
                                            <p class="steward-note">Not yet steward by seniority — grant can be removed.</p>
                                        {/if}
                                    {:else if !m.isSteward}
                                        <button
                                            class="btn-steward-grant"
                                            onclick={() => doGrantSteward(m.id)}
                                            disabled={stewardWorking}
                                        >
                                            {stewardWorking ? "…" : "Make steward"}
                                        </button>
                                    {:else}
                                        <p class="steward-note">Steward by seniority.</p>
                                    {/if}
                                </div>
                            {/if}
                        </div>
                    {/if}
                </div>
            {/each}
        </div>
        <div class="count">{filtered.length} member{filtered.length !== 1 ? "s" : ""}</div>
    {/if}
</div>

<style>
    .directory-page {
        padding: 1.5rem 1.5rem 6rem;
        max-width: 480px;
        margin: 0 auto;
    }

    @media (min-width: 768px) {
        .directory-page { padding-bottom: 2rem; max-width: 800px; }
        .member-list {
            display: grid;
            grid-template-columns: 1fr 1fr;
        }
        .member-card:nth-last-child(-n+2) > .member-row { border-bottom: none; }
        .member-card:nth-child(odd):not(:last-child) > .member-row { border-right: 1px solid #f1f5f9; }
    }

    .page-title { font-size: 1.4rem; font-weight: 700; color: #0f172a; margin: 0 0 1rem; }

    .page-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 1rem;
    }

    .page-header .page-title { margin: 0; }

    .btn-add {
        background: #16a34a;
        color: #fff;
        border: none;
        border-radius: 10px;
        padding: 0.5rem 1rem;
        font-size: 0.88rem;
        font-weight: 600;
        cursor: pointer;
    }

    .search-row { margin-bottom: 1.25rem; }

    input[type="search"] {
        width: 100%;
        box-sizing: border-box;
        border: 1px solid #cbd5e1;
        border-radius: 10px;
        font-size: 0.95rem;
        padding: 0.65rem 1rem;
        outline: none;
        transition: border-color 0.15s;
    }

    input[type="search"]:focus { border-color: #16a34a; }

    .member-list {
        display: flex;
        flex-direction: column;
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 16px;
        overflow: hidden;
    }

    .member-row {
        display: flex;
        align-items: center;
        gap: 0.85rem;
        padding: 0.75rem 1.25rem;
        border-bottom: 1px solid #f1f5f9;
        width: 100%;
        background: none;
        border-top: none;
        border-left: none;
        border-right: none;
        text-align: left;
        cursor: pointer;
        font-family: inherit;
    }

    .member-row:hover { background: #f8fafc; }
    .member-card:last-child > .member-row { border-bottom: none; }
    .member-card.expanded > .member-row { border-bottom: 1px solid #f1f5f9; }

    .member-avatar {
        width: 2.5rem;
        height: 2.5rem;
        border-radius: 50%;
        background: #dcfce7;
        color: #15803d;
        font-size: 0.85rem;
        font-weight: 700;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
    }

    .member-info { display: flex; flex-direction: column; gap: 0.1rem; flex: 1; }

    .member-name   { font-size: 0.9rem; font-weight: 600; color: #0f172a; }
    .member-handle { font-size: 0.75rem; color: #94a3b8; }

    .badge {
        font-size: 0.7rem;
        font-weight: 600;
        border-radius: 99px;
        padding: 0.2rem 0.55rem;
        text-transform: uppercase;
        letter-spacing: 0.04em;
    }

    .badge.retired { background: #ede9fe; color: #7c3aed; }
    .badge.exempt  { background: #fef3c7; color: #d97706; }
    .badge.steward { background: #dbeafe; color: #1d4ed8; }

    .chevron { font-size: 0.6rem; color: #cbd5e1; margin-left: auto; flex-shrink: 0; }

    /* ── Expanded detail panel ── */
    .member-detail {
        padding: 0.85rem 1.25rem 1rem;
        background: #f8fafc;
        border-top: 1px solid #f1f5f9;
    }

    .detail-phone {
        font-size: 0.85rem;
        color: #475569;
        margin: 0 0 0.75rem;
    }

    .reset-section { margin-bottom: 0; }

    .reset-label {
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: #94a3b8;
        margin: 0 0 0.45rem;
    }

    .reset-row {
        display: flex;
        gap: 0.5rem;
    }

    .reset-row input {
        flex: 1;
        padding: 0.5rem 0.75rem;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        font-size: 0.9rem;
        font-family: inherit;
        outline: none;
        transition: border-color 0.15s;
    }

    .reset-row input:focus { border-color: #16a34a; }

    .btn-reset {
        padding: 0.5rem 0.9rem;
        background: #0f172a;
        color: #fff;
        border: none;
        border-radius: 8px;
        font-size: 0.88rem;
        font-weight: 600;
        cursor: pointer;
        white-space: nowrap;
        transition: background 0.15s;
    }

    .btn-reset:hover:not(:disabled) { background: #1e293b; }
    .btn-reset:disabled { opacity: 0.4; cursor: not-allowed; }

    .reset-error { font-size: 0.82rem; color: #dc2626; margin: 0.4rem 0 0; }
    .reset-ok    { font-size: 0.82rem; color: #16a34a; margin: 0.4rem 0 0; font-weight: 600; }

    .steward-section { margin-top: 0.75rem; }

    .steward-note {
        font-size: 0.8rem;
        color: #94a3b8;
        margin: 0.35rem 0 0;
    }

    .btn-steward-grant {
        font-size: 0.82rem;
        font-weight: 600;
        padding: 0.4rem 0.85rem;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        background: #dbeafe;
        color: #1d4ed8;
        transition: background 0.15s;
    }
    .btn-steward-grant:hover:not(:disabled) { background: #bfdbfe; }

    .btn-steward-revoke {
        font-size: 0.82rem;
        font-weight: 600;
        padding: 0.4rem 0.85rem;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        background: #fee2e2;
        color: #b91c1c;
        transition: background 0.15s;
    }
    .btn-steward-revoke:hover:not(:disabled) { background: #fecaca; }
    .btn-steward-grant:disabled,
    .btn-steward-revoke:disabled { opacity: 0.4; cursor: not-allowed; }

    .count { text-align: center; font-size: 0.8rem; color: #94a3b8; margin-top: 0.75rem; }
</style>
