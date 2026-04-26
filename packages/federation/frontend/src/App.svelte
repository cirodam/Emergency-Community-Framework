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

<div class="app">
    <header>
        <h1>⬡ Federation</h1>
        <button class="refresh" onclick={load}>↻ Refresh</button>
    </header>

    {#if loadError}
        <div class="error-banner">{loadError}</div>
    {/if}

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
</div>

<style>
    :global(*, *::before, *::after) { box-sizing: border-box; }
    :global(body) {
        margin: 0;
        font-family: system-ui, sans-serif;
        background: #f8fafc;
        color: #0f172a;
    }

    .app {
        max-width: 860px;
        margin: 0 auto;
        padding: 1.5rem;
    }

    header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-bottom: 1.25rem;
        border-bottom: 1px solid #e2e8f0;
        margin-bottom: 1.5rem;
    }

    h1 {
        font-size: 1.5rem;
        font-weight: 700;
        margin: 0;
        color: #1e293b;
    }

    h2 {
        font-size: 1.05rem;
        font-weight: 600;
        color: #1e293b;
        margin: 0 0 1rem;
    }

    .refresh {
        background: none;
        border: 1px solid #cbd5e1;
        padding: 0.375rem 0.75rem;
        border-radius: 0.5rem;
        font-size: 0.875rem;
        cursor: pointer;
        color: #475569;
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

