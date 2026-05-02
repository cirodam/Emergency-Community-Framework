<script lang="ts">
    import { getAdminReports, adminDeleteMessage } from "../lib/api.js";
    import type { MessageReport } from "../lib/api.js";
    import { currentPage } from "../lib/session.js";

    let reports: MessageReport[] = $state([]);
    let loading = $state(true);
    let error   = $state("");

    async function load() {
        loading = true; error = "";
        try { reports = await getAdminReports(); }
        catch (e) { error = e instanceof Error ? e.message : "Failed to load reports"; }
        finally   { loading = false; }
    }

    $effect(() => { load(); });

    async function handleDelete(r: MessageReport) {
        if (!confirm(`Delete this message? This cannot be undone.\n\n"${r.message?.body?.slice(0, 120) ?? ""}"`)) return;
        try {
            await adminDeleteMessage(r.messageId);
            reports = reports.filter(x => x.messageId !== r.messageId);
        } catch (e) {
            alert(e instanceof Error ? e.message : "Failed to delete");
        }
    }

    function fmt(iso: string): string {
        return new Date(iso).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
    }
</script>

<div class="page">
    <div class="page-header">
        <button class="back-btn" onclick={() => currentPage.go("inbox")}>← Back</button>
        <h1 class="title">Moderation Queue</h1>
    </div>

    {#if loading}
        <div class="loading">Loading reports…</div>
    {:else if error}
        <div class="error-msg">{error}</div>
    {:else if reports.length === 0}
        <div class="empty">
            <div class="empty-icon">✓</div>
            <p>No reports — all clear.</p>
        </div>
    {:else}
        <ul class="report-list">
            {#each reports as r (r.id)}
                <li class="report-card">
                    <div class="report-meta">
                        <span class="badge">Report</span>
                        <span class="meta-text">Message <code>{r.messageId.slice(0, 8)}…</code></span>
                        <span class="meta-text">reported by <code>@{r.reporterId.slice(0, 12)}</code></span>
                        <span class="meta-text">{fmt(r.reportedAt)}</span>
                    </div>
                    <div class="reason"><strong>Reason:</strong> {r.reason}</div>
                    {#if r.message}
                        <div class="message-preview">
                            <div class="msg-from">From: <code>{r.message.fromHandle}</code></div>
                            <div class="msg-subject">Subject: {r.message.subject || "(no subject)"}</div>
                            <div class="msg-body">{r.message.body}</div>
                        </div>
                    {:else}
                        <div class="message-gone">Message has already been deleted.</div>
                    {/if}
                    {#if r.message}
                        <div class="actions">
                            <button class="btn-danger" onclick={() => handleDelete(r)}>Delete message</button>
                        </div>
                    {/if}
                </li>
            {/each}
        </ul>
    {/if}
</div>

<style>
    .page {
        padding: 1.5rem;
        max-width: 52rem;
        width: 100%;
    }

    .page-header {
        display: flex;
        align-items: center;
        gap: 1rem;
        margin-bottom: 1.5rem;
    }

    .back-btn {
        background: none;
        border: none;
        color: #15803d;
        font-size: 0.9rem;
        cursor: pointer;
        padding: 0;
        font-family: inherit;
    }
    .back-btn:hover { text-decoration: underline; }

    .title { font-size: 1.25rem; font-weight: 700; color: #0f172a; margin: 0; }

    .loading, .empty { color: #64748b; padding: 2rem 0; text-align: center; }
    .empty-icon { font-size: 2.5rem; margin-bottom: 0.5rem; }
    .error-msg  { color: #dc2626; background: #fef2f2; border: 1px solid #fecaca; border-radius: 0.5rem; padding: 0.75rem 1rem; }

    .report-list {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .report-card {
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 0.75rem;
        padding: 1rem 1.25rem;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .report-meta {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.8rem;
        color: #64748b;
    }

    .badge {
        background: #fef3c7;
        color: #92400e;
        font-size: 0.7rem;
        font-weight: 700;
        border-radius: 0.25rem;
        padding: 0.1rem 0.45rem;
        text-transform: uppercase;
    }

    .meta-text { color: #94a3b8; }

    .reason { font-size: 0.875rem; color: #374151; }

    .message-preview {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 0.5rem;
        padding: 0.75rem 1rem;
        font-size: 0.85rem;
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
    }

    .msg-from, .msg-subject { color: #64748b; font-size: 0.78rem; }
    .msg-body { color: #0f172a; white-space: pre-wrap; word-break: break-word; }

    .message-gone { color: #94a3b8; font-style: italic; font-size: 0.85rem; }

    .actions { display: flex; gap: 0.5rem; }

    .btn-danger {
        padding: 0.35rem 0.75rem;
        background: #dc2626;
        color: #fff;
        border: none;
        border-radius: 0.5rem;
        font-size: 0.8rem;
        font-weight: 600;
        cursor: pointer;
        font-family: inherit;
    }
    .btn-danger:hover { background: #b91c1c; }
</style>
