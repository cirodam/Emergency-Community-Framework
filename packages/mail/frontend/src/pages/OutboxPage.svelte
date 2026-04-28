<script lang="ts">
    import { getOutbox, deleteMessage } from "../lib/api.js";
    import type { MessageDto } from "../lib/api.js";
    import { currentPage, selectedThreadId, session } from "../lib/session.js";

    const s = $derived($session!);

    let messages: MessageDto[] = $state([]);
    let loading  = $state(true);
    let error    = $state("");

    async function load() {
        loading = true; error = "";
        try { messages = await getOutbox(); }
        catch (e) { error = e instanceof Error ? e.message : "Failed to load sent"; }
        finally   { loading = false; }
    }

    $effect(() => { load(); });

    function formatDate(iso: string): string {
        const d = new Date(iso);
        const now = new Date();
        if (d.toDateString() === now.toDateString()) {
            return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        }
        if (d.getFullYear() === now.getFullYear()) {
            return d.toLocaleDateString([], { month: "short", day: "numeric" });
        }
        return d.toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" });
    }

    function recipientLabel(msg: MessageDto): string {
        if (!msg.toPersonIds.length) return "(unknown)";
        const first = msg.toPersonIds[0];
        const label = first === s.personId ? "me" : `@${first.slice(0, 10)}`;
        if (msg.toPersonIds.length > 1) return `${label} +${msg.toPersonIds.length - 1}`;
        return label;
    }

    function open(msg: MessageDto) {
        selectedThreadId.set(msg.threadId);
        currentPage.go("thread");
    }

    async function remove(msg: MessageDto, e: MouseEvent) {
        e.stopPropagation();
        try {
            await deleteMessage(msg.id);
            messages = messages.filter(m => m.id !== msg.id);
        } catch { /* ignore */ }
    }
</script>

<div class="page">
    <div class="page-header">
        <h1 class="folder-title">Sent</h1>
        {#if messages.length > 0}
            <span class="count">{messages.length} message{messages.length !== 1 ? "s" : ""}</span>
        {/if}
    </div>

    {#if loading}
        <div class="list">
            {#each [1,2,3,4,5] as _}
                <div class="skeleton-row"></div>
            {/each}
        </div>
    {:else if error}
        <div class="error-msg">{error}</div>
    {:else if messages.length === 0}
        <div class="empty">
            <div class="empty-icon">↑</div>
            <p>Nothing sent yet.</p>
        </div>
    {:else}
        <ul class="list">
            {#each messages as msg (msg.id)}
                <li class="row" onclick={() => open(msg)}>
                    <div class="row-to">To: {recipientLabel(msg)}</div>
                    <div class="row-content">
                        <span class="row-subject">{msg.subject || "(no subject)"}</span>
                        <span class="row-sep"> — </span>
                        <span class="row-preview">{msg.body.replace(/\n/g, " ")}</span>
                    </div>
                    <div class="row-right">
                        <span class="row-date">{formatDate(msg.sentAt)}</span>
                        <button class="delete-btn" onclick={(e) => remove(msg, e)} aria-label="Delete">✕</button>
                    </div>
                </li>
            {/each}
        </ul>
    {/if}
</div>

<style>
    .page {
        max-width: 900px;
        margin: 0 auto;
        padding: 0;
    }

    .page-header {
        display: flex;
        align-items: baseline;
        gap: 0.75rem;
        padding: 1.25rem 1.5rem 0.5rem;
        border-bottom: 1px solid #e2e8f0;
    }

    .folder-title {
        font-size: 1.15rem;
        font-weight: 700;
        color: #0f172a;
        margin: 0;
    }

    .count {
        font-size: 0.8rem;
        color: #94a3b8;
    }

    .list {
        list-style: none;
        margin: 0;
        padding: 0;
    }

    .row {
        display: grid;
        grid-template-columns: 11rem 1fr auto;
        align-items: center;
        gap: 0;
        padding: 0.7rem 1.5rem;
        border-bottom: 1px solid #f1f5f9;
        cursor: pointer;
        transition: background 0.1s;
        background: #fff;
    }
    .row:hover { background: #f8fafc; }

    .row-to {
        font-size: 0.875rem;
        font-weight: 600;
        color: #374151;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        padding-right: 1rem;
    }

    .row-content {
        font-size: 0.875rem;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        color: #94a3b8;
    }

    .row-subject {
        color: #374151;
        font-weight: 500;
    }

    .row-sep { color: #cbd5e1; }

    .row-right {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        flex-shrink: 0;
        padding-left: 1rem;
    }

    .row-date {
        font-size: 0.78rem;
        color: #94a3b8;
        white-space: nowrap;
    }

    .delete-btn {
        background: none;
        border: none;
        font-size: 0.75rem;
        color: transparent;
        cursor: pointer;
        padding: 0.2rem;
        line-height: 1;
        transition: color 0.1s;
    }
    .row:hover .delete-btn { color: #cbd5e1; }
    .delete-btn:hover { color: #dc2626 !important; }

    .skeleton-row {
        height: 2.8rem;
        border-bottom: 1px solid #f1f5f9;
        background: linear-gradient(90deg, #f8fafc 25%, #f1f5f9 50%, #f8fafc 75%);
        background-size: 200% 100%;
        animation: shimmer 1.3s infinite;
    }
    @keyframes shimmer {
        0%   { background-position: 200% 0; }
        100% { background-position: -200% 0; }
    }

    .empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.75rem;
        padding: 6rem 0;
        color: #94a3b8;
    }
    .empty-icon { font-size: 2.5rem; }
    .empty p { margin: 0; font-size: 0.95rem; }

    .error-msg {
        color: #dc2626;
        font-size: 0.875rem;
        padding: 1rem 1.5rem;
        background: #fef2f2;
    }
</style>
