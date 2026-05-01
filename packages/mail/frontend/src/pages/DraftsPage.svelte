<script lang="ts">
    import { listDrafts, deleteDraft } from "../lib/api.js";
    import type { DraftDto } from "../lib/api.js";
    import { currentPage, selectedDraft } from "../lib/session.js";

    let drafts: DraftDto[] = $state([]);
    let loading = $state(true);
    let error   = $state("");

    async function load() {
        loading = true; error = "";
        try { drafts = await listDrafts(); }
        catch (e) { error = e instanceof Error ? e.message : "Failed to load drafts"; }
        finally   { loading = false; }
    }

    $effect(() => { load(); });

    function formatDate(iso: string): string {
        const d = new Date(iso);
        const now = new Date();
        if (d.toDateString() === now.toDateString())
            return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        return d.toLocaleDateString([], { month: "short", day: "numeric" });
    }

    async function remove(draft: DraftDto, e: MouseEvent) {
        e.stopPropagation();
        try {
            await deleteDraft(draft.id);
            drafts = drafts.filter(d => d.id !== draft.id);
        } catch { /* ignore */ }
    }

    function open(draft: DraftDto) {
        // Navigate to compose, passing draft details via store
        selectedDraft.set(draft);
        currentPage.go("compose");
    }
</script>

<div class="page">
    <div class="page-header">
        <h2 class="page-title">Drafts</h2>
    </div>

    {#if loading}
        <div class="empty-state">Loading…</div>
    {:else if error}
        <div class="error-banner">{error}</div>
    {:else if drafts.length === 0}
        <div class="empty-state">No drafts saved.</div>
    {:else}
        <ul class="message-list">
            {#each drafts as draft (draft.id)}
                <li class="message-row" onclick={() => open(draft)}>
                    <div class="msg-meta">
                        <span class="msg-to">To: {draft.toPersonIds.join(", ") || "(no recipient)"}</span>
                        <span class="msg-date">{formatDate(draft.updatedAt)}</span>
                    </div>
                    <div class="msg-subject">{draft.subject || "(no subject)"}</div>
                    <div class="msg-preview">{draft.body.slice(0, 80)}{draft.body.length > 80 ? "…" : ""}</div>
                    <div class="msg-actions">
                        <button class="icon-btn danger" title="Delete draft" onclick={(e) => remove(draft, e)}>🗑</button>
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
    .message-list { list-style: none; margin: 0; padding: 0; }
    .message-row { position: relative; padding: 12px 1.5rem; border-bottom: 1px solid #f0f0f0; cursor: pointer; transition: background .1s; }
    .message-row:hover { background: #f8f8f8; }
    .msg-meta { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 2px; }
    .msg-to { font-size: .8rem; color: #555; }
    .msg-date { font-size: .75rem; color: #aaa; }
    .msg-subject { font-weight: 600; font-size: .9rem; margin-bottom: 2px; }
    .msg-preview { font-size: .8rem; color: #666; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .msg-actions { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); display: flex; gap: 4px; opacity: 0; transition: opacity .1s; }
    .message-row:hover .msg-actions { opacity: 1; }
    .icon-btn { background: none; border: none; cursor: pointer; padding: 4px 6px; border-radius: 4px; font-size: .85rem; }
    .icon-btn.danger:hover { background: #fee; }
</style>
