<script lang="ts">
    import { getTrash, restoreMessage, permanentDeleteMessage, emptyTrash } from "../lib/api.js";
    import type { MessageDto } from "../lib/api.js";
    import { currentPage, selectedThreadId } from "../lib/session.js";

    let messages: MessageDto[] = $state([]);
    let loading  = $state(true);
    let error    = $state("");
    let emptying = $state(false);

    async function load() {
        loading = true; error = "";
        try { messages = await getTrash(); }
        catch (e) { error = e instanceof Error ? e.message : "Failed to load trash"; }
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

    async function restore(msg: MessageDto, e: MouseEvent) {
        e.stopPropagation();
        try {
            await restoreMessage(msg.id);
            messages = messages.filter(m => m.id !== msg.id);
        } catch { /* ignore */ }
    }

    async function permaDelete(msg: MessageDto, e: MouseEvent) {
        e.stopPropagation();
        if (!confirm("Permanently delete this message? This cannot be undone.")) return;
        try {
            await permanentDeleteMessage(msg.id);
            messages = messages.filter(m => m.id !== msg.id);
        } catch { /* ignore */ }
    }

    async function handleEmptyTrash() {
        if (!confirm("Permanently delete all messages in trash? This cannot be undone.")) return;
        emptying = true;
        try {
            await emptyTrash();
            messages = [];
        } catch { /* ignore */ }
        finally { emptying = false; }
    }

    function open(msg: MessageDto) {
        selectedThreadId.set(msg.threadId);
        currentPage.go("thread");
    }
</script>

<div class="page">
    <div class="page-header">
        <h2 class="page-title">Trash</h2>
        {#if messages.length > 0}
            <button class="empty-btn" disabled={emptying} onclick={handleEmptyTrash}>
                {emptying ? "Deleting…" : "Empty Trash"}
            </button>
        {/if}
    </div>

    {#if loading}
        <div class="empty-state">Loading…</div>
    {:else if error}
        <div class="error-banner">{error}</div>
    {:else if messages.length === 0}
        <div class="empty-state">Trash is empty.</div>
    {:else}
        <ul class="message-list">
            {#each messages as msg (msg.id)}
                <li class="message-row" onclick={() => open(msg)}>
                    <div class="message-meta">
                        <span class="message-subject">{msg.subject || "(no subject)"}</span>
                        <span class="message-date">{formatDate(msg.sentAt)}</span>
                    </div>
                    <div class="message-from">From: {msg.fromHandle}</div>
                    <div class="message-actions">
                        <button class="icon-btn restore-btn" title="Restore to inbox" onclick={(e) => restore(msg, e)}>↩ Restore</button>
                        <button class="icon-btn delete-btn" title="Delete forever" onclick={(e) => permaDelete(msg, e)}>✕ Delete forever</button>
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
    .empty-btn { margin-left: auto; background: none; border: 1px solid #e0b0b0; color: #c00; border-radius: 5px; padding: 3px 12px; cursor: pointer; font-size: .8rem; }
    .empty-btn:hover:not(:disabled) { background: #fef2f2; }
    .empty-btn:disabled { opacity: .5; cursor: default; }
    .empty-state { padding: 48px 0; text-align: center; color: #888; }
    .error-banner { background: #fee; border: 1px solid #fcc; border-radius: 6px; padding: 8px 12px; color: #c00; margin: 0 1.5rem 12px; }
    .message-list { list-style: none; margin: 0; padding: 0; }
    .message-row { position: relative; padding: 12px 1.5rem; border-bottom: 1px solid #f0f0f0; cursor: pointer; transition: background .1s; }
    .message-row:hover { background: #f8f8f8; }
    .message-meta { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 2px; }
    .message-subject { font-weight: 600; font-size: .9rem; }
    .message-date { font-size: .75rem; color: #aaa; }
    .message-from { font-size: .8rem; color: #666; }
    .message-actions { margin-top: 4px; display: flex; gap: 6px; opacity: 0; transition: opacity .1s; }
    .message-row:hover .message-actions { opacity: 1; }
    .icon-btn { background: none; border: 1px solid #ddd; cursor: pointer; padding: 2px 8px; border-radius: 4px; font-size: .8rem; }
    .restore-btn { color: #555; }
    .restore-btn:hover { background: #f0f0f0; }
    .delete-btn { color: #c00; border-color: #e0b0b0; }
    .delete-btn:hover { background: #fef2f2; }
</style>
