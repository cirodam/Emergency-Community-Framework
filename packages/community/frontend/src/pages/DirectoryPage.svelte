<script lang="ts">
    import { listPersons } from "../lib/api.js";
    import type { PersonDto } from "../lib/api.js";

    let members: PersonDto[] = $state([]);
    let loading = $state(true);
    let error = $state("");
    let query = $state("");

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
</script>

<div class="directory-page">
    <h2 class="page-title">Directory</h2>

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
                <div class="member-row">
                    <div class="member-avatar">{m.firstName[0]}{m.lastName[0]}</div>
                    <div class="member-info">
                        <span class="member-name">{m.firstName} {m.lastName}</span>
                        <span class="member-handle">@{m.handle}</span>
                    </div>
                    {#if m.retired}
                        <span class="badge retired">Retired</span>
                    {:else if m.disabled}
                        <span class="badge exempt">Exempt</span>
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
        .member-row:nth-last-child(-n+2) { border-bottom: none; }
        .member-row:nth-child(odd):not(:last-child) { border-right: 1px solid #f1f5f9; }
    }

    .page-title { font-size: 1.4rem; font-weight: 700; color: #0f172a; margin: 0 0 1rem; }

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

    .loading-msg { text-align: center; color: #94a3b8; padding: 3rem 0; font-size: 0.95rem; }

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
    }

    .member-row:last-child { border-bottom: none; }

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

    .count { text-align: center; font-size: 0.8rem; color: #94a3b8; margin-top: 0.75rem; }
</style>
