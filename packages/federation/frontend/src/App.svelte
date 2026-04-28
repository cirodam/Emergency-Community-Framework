<script lang="ts">
    import { onMount } from "svelte";

    interface Member {
        id:              string;
        name:            string;
        communityNodeId: string;
        joinedAt:        string;
        bankAccountId:   string | null;
    }

    interface Economics {
        kitheInCirculation: number;
        memberCount:        number;
        members:            { name: string; balance: number }[];
    }

    let members    = $state<Member[]>([]);
    let economics  = $state<Economics | null>(null);
    let loadError  = $state("");

    async function load() {
        loadError = "";
        try {
            const [mRes, eRes] = await Promise.all([
                fetch("/api/members"),
                fetch("/api/economics"),
            ]);
            members   = mRes.ok  ? await mRes.json()  as Member[]   : [];
            economics = eRes.ok  ? await eRes.json()  as Economics  : null;
        } catch {
            loadError = "Could not reach federation node";
        }
    }

    onMount(load);

    function formatKithe(n: number): string {
        return n.toLocaleString(undefined, { maximumFractionDigits: 2 }) + " kithe";
    }

    function formatDate(iso: string): string {
        return new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" });
    }
</script>

<div class="shell">
    <aside class="sidebar">
        <div class="sidebar-brand">
            <span class="brand-icon">⬡</span>
            <span class="brand-name">Federation</span>
        </div>
        <div class="sidebar-nav">
            <button class="nav-item active">
                <span>⊞</span> Members
            </button>
        </div>
        <div class="sidebar-footer">
            <button class="refresh" onclick={load}>↻ Refresh</button>
        </div>
    </aside>

    <main class="main">
        {#if loadError}
            <div class="error-banner">{loadError}</div>
        {/if}

        <h1 class="page-title">Overview</h1>

        <section class="cards">
            <div class="stat-card">
                <span class="label">Kithe in circulation</span>
                <span class="value">{economics ? formatKithe(economics.kitheInCirculation) : "—"}</span>
            </div>
            <div class="stat-card">
                <span class="label">Member communities</span>
                <span class="value">{economics?.memberCount ?? members.length}</span>
            </div>
        </section>

        <section class="member-section">
            <h2>Members</h2>
            {#if members.length === 0}
                <p class="empty">No communities have joined yet.</p>
            {:else}
                <table>
                    <thead>
                        <tr>
                            <th>Community</th>
                            <th>Joined</th>
                            <th class="right">Kithe balance</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#each members as member (member.id)}
                            {@const bal = economics?.members.find(m => m.name === member.name)?.balance}
                            <tr>
                                <td>
                                    <span class="name">{member.name}</span>
                                    <span class="node-id">{member.communityNodeId.slice(0, 12)}…</span>
                                </td>
                                <td>{formatDate(member.joinedAt)}</td>
                                <td class="right mono">{bal !== undefined ? formatKithe(bal) : "—"}</td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            {/if}
        </section>
    </main>
</div>

<style>
    :global(*, *::before, *::after) { box-sizing: border-box; }
    :global(body) {
        margin: 0;
        font-family: system-ui, sans-serif;
        background: #f8fafc;
        color: #0f172a;
    }

    /* ── Shell ─────────────────────────────────────────────────────────────── */

    .shell {
        display: flex;
        flex-direction: row;
        min-height: 100dvh;
    }

    /* ── Sidebar ───────────────────────────────────────────────────────────── */

    .sidebar {
        width: 14rem;
        min-height: 100dvh;
        height: 100dvh;
        position: sticky;
        top: 0;
        flex-shrink: 0;
        background: #fff;
        border-right: 1px solid #e2e8f0;
        display: flex;
        flex-direction: column;
        padding: 1rem 0.75rem;
        gap: 0.25rem;
    }

    .sidebar-brand {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.25rem 0.5rem 0.875rem;
        border-bottom: 1px solid #f1f5f9;
        margin-bottom: 0.5rem;
        font-weight: 700;
        font-size: 1rem;
        color: #0f172a;
    }

    .brand-icon { font-size: 1.25rem; color: #2563eb; }

    .sidebar-nav {
        display: flex;
        flex-direction: column;
        gap: 0.125rem;
        flex: 1;
    }

    .nav-item {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        width: 100%;
        padding: 0.65rem 0.875rem;
        background: none;
        border: none;
        border-radius: 10px;
        font-size: 0.9rem;
        font-weight: 500;
        color: #374151;
        cursor: pointer;
        font-family: inherit;
        text-align: left;
    }
    .nav-item.active { background: #eff6ff; color: #1d4ed8; font-weight: 600; }

    .sidebar-footer {
        margin-top: auto;
        padding-top: 0.75rem;
        border-top: 1px solid #e2e8f0;
    }

    /* ── Main ──────────────────────────────────────────────────────────────── */

    .main {
        flex: 1;
        min-width: 0;
        padding: 1.5rem 2rem 3rem;
        max-width: 800px;
    }

    .page-title {
        font-size: 1.4rem;
        font-weight: 700;
        color: #1e293b;
        margin: 0 0 1.5rem;
    }

    h2 {
        font-size: 1.05rem;
        font-weight: 600;
        color: #1e293b;
        margin: 0 0 1rem;
    }

    .refresh {
        width: 100%;
        padding: 0.375rem 0.75rem;
        background: none;
        border: 1px solid #cbd5e1;
        border-radius: 0.5rem;
        font-size: 0.875rem;
        cursor: pointer;
        color: #475569;
        font-family: inherit;
    }
    .refresh:hover { background: #f1f5f9; }

    .error-banner {
        background: #fee2e2;
        color: #991b1b;
        padding: 0.75rem 1rem;
        border-radius: 0.5rem;
        margin-bottom: 1rem;
    }

    .cards {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 1rem;
        margin-bottom: 2rem;
    }

    .stat-card {
        background: white;
        border: 1px solid #e2e8f0;
        border-radius: 0.75rem;
        padding: 1.25rem 1.5rem;
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
    }

    .label {
        font-size: 0.8rem;
        font-weight: 500;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.04em;
    }

    .value {
        font-size: 1.5rem;
        font-weight: 700;
        color: #1e40af;
    }

    .member-section {
        background: white;
        border: 1px solid #e2e8f0;
        border-radius: 0.75rem;
        padding: 1.25rem 1.5rem;
    }

    table {
        width: 100%;
        border-collapse: collapse;
    }

    th {
        text-align: left;
        font-size: 0.75rem;
        font-weight: 600;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        padding: 0 0 0.75rem;
        border-bottom: 1px solid #f1f5f9;
    }

    th.right, td.right { text-align: right; }

    td {
        padding: 0.75rem 0;
        border-bottom: 1px solid #f8fafc;
        font-size: 0.9rem;
    }

    tr:last-child td { border-bottom: none; }

    .name {
        display: block;
        font-weight: 500;
    }

    .node-id {
        display: block;
        font-size: 0.75rem;
        color: #94a3b8;
        font-family: monospace;
    }

    .mono { font-family: monospace; }

    .empty {
        color: #94a3b8;
        text-align: center;
        padding: 2rem 0;
    }
</style>

