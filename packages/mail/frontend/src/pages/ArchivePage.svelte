<script lang="ts">
    import { listThreads, archiveThread } from "../lib/api.js";
    import type { ThreadDto } from "../lib/api.js";
    import { currentPage, selectedThreadId } from "../lib/session.js";

    let threads: ThreadDto[] = $state([]);
    let loading = $state(true);
    let error   = $state("");

    async function load() {
        loading = true; error = "";
        try { threads = await listThreads("archived"); }
        catch (e) { error = e instanceof Error ? e.message : "Failed to load archive"; }
        finally   { loading = false; }
    }

    $effect(() => { load(); });

    function formatDate(iso: string): string {
        const d = new Date(iso);
        const now = new Date();
        if (d.toDateString() === now.toDateString())
            return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        if (d.getFullYear() === now.getFullYear())
            return d.toLocaleDateString([], { month: "short", day: "numeric" });
        return d.toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" });
    }

    async function unarchive(thread: ThreadDto, e: MouseEvent) {
        e.stopPropagation();
        try {
            await archiveThread(thread.id, false);
            threads = threads.filter(t => t.id !== thread.id);
        } catch { /* ignore */ }
    }

    function open(thread: ThreadDto) {
        selectedThreadId.set(thread.id);
        currentPage.go("thread");
    }
</script>

<div class="page">
    <div class="page-header">
        <h2 class="page-title">Archive</h2>
    </div>

    {#if loading}
        <div class="empty-state">Loading…</div>
    {:else if error}
        <div class="error-banner">{error}</div>
    {:else if threads.length === 0}
        <div class="empty-state">No archived threads.</div>
    {:else}
        <ul class="thread-list">
            {#each threads as thread (thread.id)}
                <li class="thread-row" onclick={() => open(thread)}>
                    <div class="thread-meta">
                        <span class="thread-subject">{thread.subject || "(no subject)"}</span>
                        <span class="thread-date">{formatDate(thread.lastMessageAt)}</span>
                    </div>
                    <div class="thread-participants">
                        {thread.participantIds.slice(0, 3).join(", ")}{thread.participantIds.length > 3 ? "…" : ""}
                    </div>
                    <div class="thread-actions">
                        <button class="icon-btn" title="Move to inbox" onclick={(e) => unarchive(thread, e)}>↩ Unarchive</button>
                    </div>
                </li>
            {/each}
        </ul>
    {/if}
</div>

<style>
    .page { max-width: 900px; margin: 0 auto; padding: 0; }
    .page-header { display: flex; align-items: baseline; gap: 0.75rem; padding: 1.25rem 1.5rem 0.5rem; border-bottom: 1px solid #e2e8f0; margin-bottom: 8px; }
    .page-title { margin: 0; font-size: 1.15rem; font-weight: 700; color: #0f172a; }
    .empty-state { padding: 48px 0; text-align: center; color: #888; }
    .error-banner { background: #fee; border: 1px solid #fcc; border-radius: 6px; padding: 8px 12px; color: #c00; margin: 0 1.5rem 12px; }
    .thread-list { list-style: none; margin: 0; padding: 0; }
    .thread-row { position: relative; padding: 12px 1.5rem; border-bottom: 1px solid #f0f0f0; cursor: pointer; transition: background .1s; }
    .thread-row:hover { background: #f8f8f8; }
    .thread-meta { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 2px; }
    .thread-subject { font-weight: 600; font-size: .9rem; }
    .thread-date { font-size: .75rem; color: #aaa; }
    .thread-participants { font-size: .8rem; color: #666; }
    .thread-actions { margin-top: 4px; opacity: 0; transition: opacity .1s; }
    .thread-row:hover .thread-actions { opacity: 1; }
    .icon-btn { background: none; border: 1px solid #ddd; cursor: pointer; padding: 2px 8px; border-radius: 4px; font-size: .8rem; color: #555; }
    .icon-btn:hover { background: #f0f0f0; }
</style>
