<script lang="ts">
    import { getThread, sendMessage } from "../lib/api.js";
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

    async function load() {
        loading = true; error = "";
        try { detail = await getThread(threadId); }
        catch (e) { error = e instanceof Error ? e.message : "Failed to load thread"; }
        finally   { loading = false; }
    }

    $effect(() => { load(); });

    function otherParticipant(): string {
        if (!detail) return "";
        return detail.thread.participantIds.find(id => id !== s.personId) ?? "";
    }

    function formatDate(iso: string): string {
        return new Date(iso).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
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
        } catch (e) {
            sendError = e instanceof Error ? e.message : "Failed to send reply";
        } finally {
            sending = false;
        }
    }
</script>

<div class="page">
    <button class="back-btn" onclick={() => currentPage.go("inbox")}>‹ Inbox</button>

    {#if loading}
        <div class="skeleton tall"></div>
    {:else if error}
        <p class="error-msg">{error}</p>
    {:else if detail}
        <h2 class="thread-subject">{detail.thread.subject || "(no subject)"}</h2>

        <div class="messages">
            {#each detail.messages as msg (msg.id)}
                {@const mine = msg.fromPersonId === s.personId}
                <div class="bubble-row" class:mine>
                    {#if !mine}
                        <div class="avatar">{msg.fromPersonId.slice(0, 2).toUpperCase()}</div>
                    {/if}
                    <div class="bubble" class:mine>
                        <p class="bubble-body">{msg.body}</p>
                        <span class="bubble-date">{formatDate(msg.sentAt)}</span>
                    </div>
                    {#if mine}
                        <div class="avatar mine">{s.firstName[0]}{s.lastName[0]}</div>
                    {/if}
                </div>
            {/each}
        </div>

        <div class="reply-box">
            {#if sendError}
                <p class="send-error">{sendError}</p>
            {/if}
            <textarea
                class="reply-input"
                placeholder="Write a reply…"
                bind:value={replyBody}
                rows={3}
                disabled={sending}
                onkeydown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) reply(); }}
            ></textarea>
            <button class="send-btn" onclick={reply} disabled={sending || !replyBody.trim()}>
                {sending ? "Sending…" : "Send ↑"}
            </button>
        </div>
    {/if}
</div>

<style>
    .page { padding: 1.5rem; max-width: 720px; margin: 0 auto; display: flex; flex-direction: column; gap: 1rem; }

    .back-btn {
        background: none;
        border: none;
        font-size: 0.875rem;
        color: #16a34a;
        cursor: pointer;
        padding: 0;
        align-self: flex-start;
        font-weight: 600;
    }

    .thread-subject { font-size: 1.15rem; font-weight: 700; color: #0f172a; margin: 0; }

    .messages { display: flex; flex-direction: column; gap: 0.75rem; }

    .bubble-row {
        display: flex;
        align-items: flex-end;
        gap: 0.5rem;
    }
    .bubble-row.mine { flex-direction: row-reverse; }

    .avatar {
        width: 2rem;
        height: 2rem;
        border-radius: 50%;
        background: #dcfce7;
        color: #15803d;
        font-size: 0.7rem;
        font-weight: 700;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
    }
    .avatar.mine { background: #e0f2fe; color: #0369a1; }

    .bubble {
        max-width: 70%;
        padding: 0.75rem 1rem;
        border-radius: 1rem;
        background: #f1f5f9;
    }
    .bubble.mine { background: #dcfce7; }

    .bubble-body { margin: 0 0 0.35rem; font-size: 0.9rem; color: #0f172a; white-space: pre-wrap; word-break: break-word; }
    .bubble-date { font-size: 0.7rem; color: #94a3b8; }

    .reply-box {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        border-top: 1px solid #e2e8f0;
        padding-top: 1rem;
        margin-top: 0.5rem;
    }

    .reply-input {
        resize: vertical;
        padding: 0.75rem 1rem;
        border: 1px solid #cbd5e1;
        border-radius: 0.75rem;
        font-size: 0.9rem;
        font-family: inherit;
        outline: none;
        background: #fff;
    }
    .reply-input:focus { border-color: #16a34a; box-shadow: 0 0 0 2px #dcfce7; }

    .send-btn {
        align-self: flex-end;
        padding: 0.5rem 1.25rem;
        background: #16a34a;
        color: #fff;
        border: none;
        border-radius: 0.5rem;
        font-size: 0.875rem;
        font-weight: 600;
        cursor: pointer;
    }
    .send-btn:disabled { background: #86efac; cursor: default; }

    .send-error { font-size: 0.8rem; color: #dc2626; margin: 0; }

    .skeleton.tall {
        height: 16rem;
        background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
        background-size: 200% 100%;
        animation: shimmer 1.3s infinite;
        border-radius: 0.75rem;
    }
    @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

    .error-msg { color: #dc2626; font-size: 0.875rem; padding: 1rem; background: #fef2f2; border-radius: 0.5rem; }
</style>
