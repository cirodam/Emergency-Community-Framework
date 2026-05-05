<script lang="ts">
    import { onMount } from "svelte";
    import { listSessions } from "../lib/api.js";
    import type { LyceumSession } from "../lib/api.js";
    import { session } from "../lib/session.js";
    import { currentPage, selectedSessionId } from "../lib/nav.js";

    let sessions = $state<LyceumSession[]>([]);
    let loading  = $state(true);

    const me = $derived($session?.personId ?? "");

    onMount(async () => {
        const all = await listSessions();
        sessions  = all.filter(s => s.instructorIds.includes(me));
        loading   = false;
    });

    function open(id: string) {
        selectedSessionId.set(id);
        currentPage.set("session");
    }
</script>

<div class="page">
    <h1>My Sessions</h1>
    <p class="muted">Sessions where you are listed as an instructor.</p>

    {#if loading}
        <p class="muted">Loading…</p>
    {:else if sessions.length === 0}
        <p class="muted">You haven't proposed any sessions yet. <button class="link" onclick={() => currentPage.set("create-session")}>Propose one?</button></p>
    {:else}
        <ul class="list">
            {#each sessions as s (s.id)}
                <li>
                    <button class="row" onclick={() => open(s.id)}>
                        <div class="row-main">
                            <span class="title">{s.title}</span>
                            <span class="meta">{new Date(s.scheduledAt).toLocaleString()} · {s.location}</span>
                        </div>
                        <span class="status {s.status}">{s.status}</span>
                    </button>
                </li>
            {/each}
        </ul>
    {/if}
</div>

<style>
    .page { max-width: 700px; }
    h1 { margin: 0 0 0.5rem; }
    .muted { color: #6b7280; margin-bottom: 1.5rem; }
    .link { background: none; border: none; color: #3b82f6; cursor: pointer; padding: 0; text-decoration: underline; }
    .list { list-style: none; padding: 0; display: flex; flex-direction: column; gap: 0.5rem; }
    .row {
        width: 100%; display: flex; align-items: center; gap: 1rem;
        background: #fff; border: 1px solid #e5e7eb; border-radius: 8px;
        padding: 0.85rem 1rem; cursor: pointer; text-align: left;
    }
    .row:hover { background: #f9fafb; }
    .row-main { display: flex; flex-direction: column; gap: 0.25rem; flex: 1; }
    .title { font-weight: 600; }
    .meta { font-size: 0.82rem; color: #6b7280; }
    .status { font-size: 0.75rem; padding: 0.2rem 0.5rem; border-radius: 999px; font-weight: 600; flex-shrink: 0; }
    .status.approved { background: #d1fae5; color: #065f46; }
    .status.draft { background: #f3f4f6; color: #374151; }
    .status.pending-approval { background: #fef3c7; color: #92400e; }
    .status.completed { background: #e0e7ff; color: #3730a3; }
    .status.cancelled { background: #fee2e2; color: #991b1b; }
</style>
