<script lang="ts">
    import { getThread, sendMessage, reportMessage, archiveThread } from "../lib/api.js";
    import type { MessageDto, ThreadDetail } from "../lib/api.js";
    import { currentPage, session } from "../lib/session.js";

    const { threadId }: { threadId: string } = $props();
    const s = $derived($session!);

    let detail: ThreadDetail | null = $state(null);
    let loading = $state(true);
    let error   = $state("");

    // Reply state
    let replyBody  = $state("");
    let sending    = $state(false);
    let sendError  = $state("");

    // Which messages are collapsed (all except the last are collapsed by default)
    let collapsed: Set<string> = $state(new Set());

    async function load() {
        loading = true; error = "";
        try {
            detail = await getThread(threadId);
            // Collapse all but the last message
            if (detail.messages.length > 1) {
                const toCollapse = detail.messages.slice(0, -1).map(m => m.id);
                collapsed = new Set(toCollapse);
            }
        } catch (e) {
            error = e instanceof Error ? e.message : "Failed to load thread";
        } finally {
            loading = false;
        }
    }

    $effect(() => { load(); });

    function toggle(id: string) {
        const next = new Set(collapsed);
        if (next.has(id)) next.delete(id); else next.add(id);
        collapsed = next;
    }

    function otherParticipant(): string {
        if (!detail) return "";
        return detail.thread.participantHandles.find(h => h !== s.handle) ?? "";
    }

    function senderLabel(msg: MessageDto): string {
        if (msg.fromHandle === s.handle) return `${s.firstName} ${s.lastName} <@${s.handle}>`;
        return `@${msg.fromHandle}`;
    }

    function recipientLabel(msg: MessageDto): string {
        const handles = msg.toHandles ?? [];
        return handles.map(h => h === s.handle ? `@${s.handle}` : `@${h}`).join(", ") || "(none)";
    }

    function formatFull(iso: string): string {
        return new Date(iso).toLocaleString([], { dateStyle: "long", timeStyle: "short" });
    }

    function formatShort(iso: string): string {
        const d = new Date(iso);
        const now = new Date();
        if (d.toDateString() === now.toDateString()) {
            return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        }
        return d.toLocaleDateString([], { month: "short", day: "numeric" });
    }

    async function flagMessage(msg: MessageDto) {
        const reason = prompt("Reason for reporting (optional):") ?? "";
        try { await reportMessage(msg.id, reason); }
        catch { /* ignore */ }
    }

    async function reply() {
        const to = otherParticipant();
        if (!to || !replyBody.trim()) return;
        sending = true; sendError = "";
        try {
            const msg = await sendMessage(to, detail!.thread.subject, replyBody.trim(), threadId);
            detail = {
                thread:   { ...detail!.thread, lastMessageAt: msg.sentAt },
                messages: [...detail!.messages, msg],
            };
            replyBody = "";
            // Expand the new message
            const next = new Set(collapsed);
            next.delete(msg.id);
            collapsed = next;
        } catch (e) {
            sendError = e instanceof Error ? e.message : "Failed to send reply";
        } finally {
            sending = false;
        }
    }
    async function archive() {
        if (!detail) return;
        try {
            await archiveThread(detail.thread.id, true);
            currentPage.go("inbox");
        } catch { /* ignore */ }
    }
</script>

<div class="page">
    <div class="page-header">
        <button class="back-btn" onclick={() => currentPage.go("inbox")}>‹ Inbox</button>
        {#if detail}
            <h1 class="subject">{detail.thread.subject || "(no subject)"}</h1>
            <span class="msg-count">{detail.messages.length} message{detail.messages.length !== 1 ? "s" : ""}</span>
            <button class="archive-btn" onclick={archive} title="Archive thread">Archive</button>
        {/if}
    </div>

    {#if loading}
        <div class="skeleton-block"></div>
        <div class="skeleton-block tall"></div>
    {:else if error}
        <div class="error-msg">{error}</div>
    {:else if detail}
        <div class="conversation">
            {#each detail.messages as msg, i (msg.id)}
                {@const mine = msg.fromHandle === s.handle}
                {@const isCollapsed = collapsed.has(msg.id)}

                <div class="email-card" class:mine>
                    <!-- Message header — always visible, click to expand/collapse -->
                    <button class="email-header" onclick={() => toggle(msg.id)}>
                        <div class="header-left">
                            <div class="sender-avatar" class:mine>
                                {mine ? `${s.firstName[0]}${s.lastName[0]}` : msg.fromHandle.slice(0, 2).toUpperCase()}
                            </div>
                            <div class="header-meta">
                                <span class="sender-name">{mine ? `${s.firstName} ${s.lastName}` : `@${msg.fromHandle}`}</span>
                                {#if isCollapsed}
                                    <span class="preview-collapsed">{msg.body.replace(/\n/g, " ").slice(0, 60)}{msg.body.length > 60 ? "…" : ""}</span>
                                {:else}
                                    <span class="to-line">to {recipientLabel(msg)}</span>
                                {/if}
                            </div>
                        </div>
                        <div class="header-right">
                            <span class="msg-date">{isCollapsed ? formatShort(msg.sentAt) : formatFull(msg.sentAt)}</span>
                            {#if !mine}
                                <button class="flag-btn" onclick={(e) => { e.stopPropagation(); flagMessage(msg); }} aria-label="Report">⚑</button>
                            {/if}
                            <span class="chevron">{isCollapsed ? "›" : "‹"}</span>
                        </div>
                    </button>

                    {#if !isCollapsed}
                        <div class="email-body">
                            <p class="body-text">{msg.body}</p>
                        </div>
                    {/if}
                </div>
            {/each}
        </div>

        <!-- Reply form -->
        <div class="reply-section">
            <div class="reply-label">Reply</div>
            {#if sendError}
                <p class="send-error">{sendError}</p>
            {/if}
            <div class="reply-box">
                <textarea
                    class="reply-input"
                    placeholder="Write your reply…"
                    bind:value={replyBody}
                    rows={5}
                    disabled={sending}
                    onkeydown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) reply(); }}
                ></textarea>
                <div class="reply-actions">
                    <span class="reply-hint">Ctrl+Enter to send</span>
                    <button
                        class="send-btn"
                        onclick={reply}
                        disabled={sending || !replyBody.trim()}
                    >
                        {sending ? "Sending…" : "Send"}
                    </button>
                </div>
            </div>
        </div>
    {/if}
</div>

<style>
    .page {
        max-width: 760px;
        margin: 0 auto;
        padding: 0 0 4rem;
        display: flex;
        flex-direction: column;
    }

    /* ── Header ──────────────────────────────────────────────────────────── */

    .page-header {
        padding: 1.25rem 1.5rem 1rem;
        border-bottom: 1px solid #e2e8f0;
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
    }

    .back-btn {
        background: none;
        border: none;
        font-size: 0.8rem;
        color: #16a34a;
        cursor: pointer;
        padding: 0;
        align-self: flex-start;
        font-weight: 600;
        font-family: inherit;
    }

    .archive-btn {
        margin-left: auto;
        background: none;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        padding: 4px 10px;
        font-size: 0.8rem;
        cursor: pointer;
        color: #64748b;
        font-family: inherit;
    }
    .archive-btn:hover { background: #f1f5f9; }

    .subject {
        font-size: 1.15rem;
        font-weight: 700;
        color: #0f172a;
        margin: 0;
        line-height: 1.3;
    }

    .msg-count {
        font-size: 0.78rem;
        color: #94a3b8;
    }

    /* ── Conversation ───────────────────────────────────────────────────── */

    .conversation {
        display: flex;
        flex-direction: column;
        padding: 1rem 1.5rem;
        gap: 0.375rem;
    }

    .email-card {
        border: 1px solid #e2e8f0;
        border-radius: 0.75rem;
        overflow: hidden;
        background: #fff;
    }

    .email-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 0.75rem;
        padding: 0.875rem 1rem;
        width: 100%;
        background: none;
        border: none;
        cursor: pointer;
        text-align: left;
        font-family: inherit;
        transition: background 0.1s;
    }
    .email-header:hover { background: #f8fafc; }

    .header-left {
        display: flex;
        align-items: flex-start;
        gap: 0.75rem;
        flex: 1;
        min-width: 0;
    }

    .sender-avatar {
        width: 2.25rem;
        height: 2.25rem;
        border-radius: 50%;
        background: #dcfce7;
        color: #15803d;
        font-size: 0.7rem;
        font-weight: 700;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        text-transform: uppercase;
    }
    .sender-avatar.mine { background: #e0f2fe; color: #0369a1; }

    .header-meta {
        display: flex;
        flex-direction: column;
        gap: 0.15rem;
        min-width: 0;
    }

    .sender-name {
        font-size: 0.875rem;
        font-weight: 600;
        color: #0f172a;
    }

    .to-line {
        font-size: 0.78rem;
        color: #94a3b8;
    }

    .preview-collapsed {
        font-size: 0.82rem;
        color: #94a3b8;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 40ch;
        display: block;
    }

    .header-right {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        flex-shrink: 0;
    }

    .msg-date {
        font-size: 0.78rem;
        color: #94a3b8;
        white-space: nowrap;
    }

    .chevron {
        font-size: 1rem;
        color: #cbd5e1;
        line-height: 1;
    }

    .flag-btn {
        background: none;
        border: none;
        font-size: 0.8rem;
        color: #d1d5db;
        cursor: pointer;
        padding: 0.15rem;
        line-height: 1;
        transition: color 0.1s;
    }
    .flag-btn:hover { color: #f59e0b; }

    .email-body {
        padding: 0 1rem 1rem 4rem; /* indent to align with sender name */
        border-top: 1px solid #f1f5f9;
    }

    .body-text {
        margin: 0.875rem 0 0;
        font-size: 0.9rem;
        color: #1e293b;
        line-height: 1.7;
        white-space: pre-wrap;
        word-break: break-word;
    }

    /* ── Reply ──────────────────────────────────────────────────────────── */

    .reply-section {
        margin: 0 1.5rem;
        border: 1px solid #e2e8f0;
        border-radius: 0.75rem;
        overflow: hidden;
    }

    .reply-label {
        padding: 0.6rem 1rem;
        font-size: 0.8rem;
        font-weight: 600;
        color: #64748b;
        background: #f8fafc;
        border-bottom: 1px solid #e2e8f0;
    }

    .reply-box {
        padding: 0.75rem 1rem;
        display: flex;
        flex-direction: column;
        gap: 0.6rem;
    }

    .reply-input {
        width: 100%;
        box-sizing: border-box;
        resize: vertical;
        padding: 0.75rem;
        border: 1px solid #e2e8f0;
        border-radius: 0.5rem;
        font-size: 0.9rem;
        font-family: inherit;
        outline: none;
        background: #fff;
        color: #0f172a;
        transition: border-color 0.15s;
    }
    .reply-input:focus { border-color: #16a34a; }

    .reply-actions {
        display: flex;
        align-items: center;
        justify-content: space-between;
    }

    .reply-hint {
        font-size: 0.75rem;
        color: #cbd5e1;
    }

    .send-btn {
        padding: 0.5rem 1.25rem;
        background: #16a34a;
        color: #fff;
        border: none;
        border-radius: 0.5rem;
        font-size: 0.875rem;
        font-weight: 600;
        cursor: pointer;
        font-family: inherit;
        transition: background 0.15s;
    }
    .send-btn:hover:not(:disabled) { background: #15803d; }
    .send-btn:disabled { background: #86efac; cursor: default; }

    .send-error { font-size: 0.8rem; color: #dc2626; margin: 0; }

    /* ── Misc ───────────────────────────────────────────────────────────── */

    .skeleton-block {
        margin: 1rem 1.5rem 0;
        height: 4rem;
        border-radius: 0.75rem;
        background: linear-gradient(90deg, #f8fafc 25%, #f1f5f9 50%, #f8fafc 75%);
        background-size: 200% 100%;
        animation: shimmer 1.3s infinite;
    }
    .skeleton-block.tall { height: 10rem; margin-top: 0.5rem; }
    @keyframes shimmer {
        0%   { background-position: 200% 0; }
        100% { background-position: -200% 0; }
    }

    .error-msg {
        color: #dc2626;
        font-size: 0.875rem;
        padding: 1rem 1.5rem;
        background: #fef2f2;
    }
</style>

