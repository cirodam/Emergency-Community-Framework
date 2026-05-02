<script lang="ts">
    import { searchMessages } from "../lib/api.js";
    import type { MessageDto } from "../lib/api.js";
    import { currentPage, selectedThreadId, session } from "../lib/session.js";

    const s = $derived($session!);

    let query   = $state("");
    let results: MessageDto[] = $state([]);
    let loading = $state(false);
    let error   = $state("");
    let searched = $state(false);

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    function onInput() {
        if (debounceTimer) clearTimeout(debounceTimer);
        if (!query.trim()) { results = []; searched = false; return; }
        debounceTimer = setTimeout(() => runSearch(), 300);
    }

    async function runSearch() {
        if (!query.trim()) return;
        loading = true; error = ""; searched = true;
        try { results = await searchMessages(query.trim()); }
        catch (e) { error = e instanceof Error ? e.message : "Search failed"; }
        finally   { loading = false; }
    }

    function formatDate(iso: string): string {
        const d = new Date(iso);
        const now = new Date();
        if (d.toDateString() === now.toDateString())
            return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        if (d.getFullYear() === now.getFullYear())
            return d.toLocaleDateString([], { month: "short", day: "numeric" });
        return d.toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" });
    }

    function open(msg: MessageDto) {
        selectedThreadId.set(msg.threadId);
        currentPage.go("thread");
    }

    function senderLabel(msg: MessageDto): string {
        return msg.fromHandle === s.handle ? "me" : `@${msg.fromHandle}`;
    }
</script>

<div class="page">
    <div class="page-header">
        <h2 class="page-title">Search</h2>
    </div>

    <div class="search-bar">
        <input
            class="search-input"
            type="search"
            placeholder="Search subject and body…"
            bind:value={query}
            oninput={onInput}
            onkeydown={(e) => e.key === "Enter" && runSearch()}
            autofocus
        />
        <button class="search-btn" onclick={runSearch} disabled={loading || !query.trim()}>
            {loading ? "…" : "Search"}
        </button>
    </div>

    {#if error}
        <div class="error-banner">{error}</div>
    {:else if loading}
        <div class="empty-state">Searching…</div>
    {:else if searched && results.length === 0}
        <div class="empty-state">No messages found for "{query}".</div>
    {:else if results.length > 0}
        <div class="result-count">{results.length} result{results.length !== 1 ? "s" : ""}</div>
        <ul class="message-list">
            {#each results as msg (msg.id)}
                <li class="message-row" onclick={() => open(msg)}>
                    <div class="msg-meta">
                        <span class="msg-from">{senderLabel(msg)}</span>
                        <span class="msg-date">{formatDate(msg.sentAt)}</span>
                    </div>
                    <div class="msg-subject">{msg.subject || "(no subject)"}</div>
                    <div class="msg-body">{msg.body.slice(0, 120)}{msg.body.length > 120 ? "…" : ""}</div>
                </li>
            {/each}
        </ul>
    {/if}
</div>

<style>
    .page { max-width: 900px; margin: 0 auto; padding: 0; }
    .page-header { display: flex; align-items: baseline; gap: 0.75rem; padding: 1.25rem 1.5rem 0.5rem; border-bottom: 1px solid #e2e8f0; margin-bottom: 12px; }
    .page-title { margin: 0; font-size: 1.15rem; font-weight: 700; color: #0f172a; }
    .search-bar { display: flex; gap: 8px; margin: 0 1.5rem 16px; }
    .search-input { flex: 1; padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px; font-size: .9rem; outline: none; }
    .search-input:focus { border-color: #888; }
    .search-btn { padding: 8px 16px; background: #222; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-size: .9rem; }
    .search-btn:disabled { background: #ccc; cursor: default; }
    .error-banner { background: #fee; border: 1px solid #fcc; border-radius: 6px; padding: 8px 12px; color: #c00; margin: 0 1.5rem 12px; }
    .empty-state { padding: 48px 0; text-align: center; color: #888; }
    .result-count { font-size: .8rem; color: #888; margin: 0 1.5rem 4px; }
    .message-list { list-style: none; margin: 0; padding: 0; }
    .message-row { padding: 12px 1.5rem; border-bottom: 1px solid #f0f0f0; cursor: pointer; transition: background .1s; }
    .message-row:hover { background: #f8f8f8; }
    .msg-meta { display: flex; justify-content: space-between; margin-bottom: 2px; }
    .msg-from { font-size: .8rem; color: #555; }
    .msg-date { font-size: .75rem; color: #aaa; }
    .msg-subject { font-weight: 600; font-size: .9rem; margin-bottom: 2px; }
    .msg-body { font-size: .8rem; color: #666; line-height: 1.4; }
</style>
