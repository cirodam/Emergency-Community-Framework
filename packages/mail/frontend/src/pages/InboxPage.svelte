<script lang="ts">
    import { getInbox, markRead, deleteMessage } from "../lib/api.js";
    import type { MessageDto } from "../lib/api.js";
    import { currentPage, selectedThreadId, session } from "../lib/session.js";

    const s = $derived($session!);

    let messages: MessageDto[] = $state([]);
    let loading  = $state(true);
    let error    = $state("");

    async function load() {
        loading = true; error = "";
        try { messages = await getInbox(); }
        catch (e) { error = e instanceof Error ? e.message : "Failed to load inbox"; }
        finally   { loading = false; }
    }

    $effect(() => { load(); });

    function formatDate(iso: string): string {
        const d = new Date(iso);
        const now = new Date();
        if (d.toDateString() === now.toDateString()) {
            return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        }
        return d.toLocaleDateString([], { month: "short", day: "numeric" });
    }

    async function openThread(msg: MessageDto) {
        if (!msg.readAt) {
            try {
                const updated = await markRead(msg.id);
                messages = messages.map(m => m.id === msg.id ? updated : m);
            } catch { /* non-fatal */ }
        }
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

    function isSelf(msg: MessageDto): boolean {
        return msg.fromPersonId === s.personId;
    }
</script>

<div class="page">
    <div class="page-header">
        <h2 class="page-title">Inbox</h2>
        <button class="btn-compose" onclick={() => currentPage.go("compose")}>+ Compose</button>
    </div>

    {#if loading}
        {#each [1,2,3] as _}
            <div class="skeleton"></div>
        {/each}
    {:else if error}
        <p class="error-msg">{error}</p>
    {:else if messages.length === 0}
        <div class="empty">
            <span class="empty-icon">✉</span>
            <p>Your inbox is empty.</p>
        </div>
    {:else}
        <ul class="message-list">
            {#each messages as msg (msg.id)}
                <li class="message-row" class:unread={!msg.readAt} onclick={() => openThread(msg)}>
                    <div class="from-avatar">{msg.fromPersonId.slice(0, 2).toUpperCase()}</div>
                    <div class="message-body">
                        <div class="message-top">
                            <span class="from-id">{isSelf(msg) ? "me → " : ""}{msg.fromPersonId.slice(0, 8)}…</span>
                            <span class="date">{formatDate(msg.sentAt)}</span>
                        </div>
                        <div class="subject">{msg.subject || "(no subject)"}</div>
                        <div class="preview">{msg.body.slice(0, 80)}{msg.body.length > 80 ? "…" : ""}</div>
                    </div>
                    <button class="delete-btn" onclick={(e) => remove(msg, e)} aria-label="Delete">✕</button>
                </li>
            {/each}
        </ul>
    {/if}
</div>

<style>
    .page { padding: 1.5rem; max-width: 720px; margin: 0 auto; }

    .page-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 1.25rem;
    }

    .page-title { font-size: 1.25rem; font-weight: 700; color: #0f172a; margin: 0; }

    .btn-compose {
        padding: 0.45rem 1rem;
        background: #16a34a;
        color: #fff;
        border: none;
        border-radius: 0.5rem;
        font-size: 0.875rem;
        font-weight: 600;
        cursor: pointer;
    }

    .message-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.25rem; }

    .message-row {
        display: flex;
        align-items: flex-start;
        gap: 0.875rem;
        padding: 0.875rem 1rem;
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 0.75rem;
        cursor: pointer;
        transition: background 0.1s;
        position: relative;
    }

    .message-row:hover  { background: #f8fafc; }
    .message-row.unread { border-left: 3px solid #16a34a; background: #f0fdf4; }
    .message-row.unread .subject { font-weight: 700; }

    .from-avatar {
        width: 2.25rem;
        height: 2.25rem;
        border-radius: 50%;
        background: #dcfce7;
        color: #15803d;
        font-size: 0.75rem;
        font-weight: 700;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
    }

    .message-body { flex: 1; min-width: 0; }
    .message-top  { display: flex; justify-content: space-between; margin-bottom: 0.15rem; }
    .from-id { font-size: 0.8rem; color: #64748b; }
    .date    { font-size: 0.75rem; color: #94a3b8; flex-shrink: 0; }
    .subject { font-size: 0.9rem; font-weight: 500; color: #0f172a; margin-bottom: 0.1rem; }
    .preview { font-size: 0.8rem; color: #94a3b8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    .delete-btn {
        background: none;
        border: none;
        color: #cbd5e1;
        cursor: pointer;
        font-size: 0.8rem;
        padding: 0.25rem;
        flex-shrink: 0;
        align-self: center;
    }
    .delete-btn:hover { color: #dc2626; }

    .skeleton {
        height: 4.5rem;
        background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
        background-size: 200% 100%;
        animation: shimmer 1.3s infinite;
        border-radius: 0.75rem;
        margin-bottom: 0.25rem;
    }
    @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

    .empty { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; padding: 4rem 0; color: #94a3b8; }
    .empty-icon { font-size: 2.5rem; }
    .empty p { margin: 0; font-size: 0.95rem; }

    .error-msg { color: #dc2626; font-size: 0.875rem; padding: 1rem; background: #fef2f2; border-radius: 0.5rem; }
</style>
