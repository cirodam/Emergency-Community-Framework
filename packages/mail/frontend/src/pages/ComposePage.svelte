<script lang="ts">
    import { sendMessage } from "../lib/api.js";
    import { currentPage, selectedThreadId } from "../lib/session.js";

    let toPersonId = $state("");
    let subject    = $state("");
    let body       = $state("");
    let sending    = $state(false);
    let error      = $state("");

    async function send() {
        if (!toPersonId.trim() || !body.trim()) return;
        sending = true; error = "";
        try {
            const msg = await sendMessage(toPersonId.trim(), subject.trim(), body.trim());
            // Navigate to the thread that was just created
            selectedThreadId.set(msg.threadId);
            currentPage.go("thread");
        } catch (e) {
            error = e instanceof Error ? e.message : "Failed to send";
        } finally {
            sending = false;
        }
    }
</script>

<div class="page">
    <button class="back-btn" onclick={() => currentPage.go("inbox")}>‹ Inbox</button>
    <h2 class="page-title">New Message</h2>

    {#if error}
        <div class="error-banner">{error}</div>
    {/if}

    <form class="compose-form" onsubmit={(e) => { e.preventDefault(); send(); }}>
        <label class="field">
            <span>To (person ID or handle)</span>
            <input
                type="text"
                bind:value={toPersonId}
                placeholder="Recipient person ID"
                autocapitalize="none"
                spellcheck={false}
                disabled={sending}
                required
            />
        </label>

        <label class="field">
            <span>Subject</span>
            <input
                type="text"
                bind:value={subject}
                placeholder="(optional)"
                disabled={sending}
            />
        </label>

        <label class="field">
            <span>Message</span>
            <textarea
                bind:value={body}
                placeholder="Write your message…"
                rows={8}
                disabled={sending}
                required
            ></textarea>
        </label>

        <button class="send-btn" type="submit" disabled={sending || !toPersonId.trim() || !body.trim()}>
            {sending ? "Sending…" : "Send ↑"}
        </button>
    </form>
</div>

<style>
    .page { padding: 1.5rem; max-width: 640px; margin: 0 auto; display: flex; flex-direction: column; gap: 1rem; }

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

    .page-title { font-size: 1.25rem; font-weight: 700; color: #0f172a; margin: 0; }

    .error-banner {
        background: #fee2e2;
        color: #991b1b;
        padding: 0.75rem 1rem;
        border-radius: 0.75rem;
        font-size: 0.875rem;
    }

    .compose-form { display: flex; flex-direction: column; gap: 0.75rem; }

    .field {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
        font-size: 0.875rem;
        font-weight: 500;
        color: #374151;
    }

    input, textarea {
        padding: 0.75rem 1rem;
        border: 1px solid #cbd5e1;
        border-radius: 0.75rem;
        font-size: 0.9rem;
        font-family: inherit;
        outline: none;
        background: #fff;
        resize: vertical;
    }

    input:focus, textarea:focus { border-color: #16a34a; box-shadow: 0 0 0 2px #dcfce7; }

    .send-btn {
        align-self: flex-end;
        padding: 0.6rem 1.5rem;
        background: #16a34a;
        color: #fff;
        border: none;
        border-radius: 0.5rem;
        font-size: 0.9rem;
        font-weight: 600;
        cursor: pointer;
    }
    .send-btn:disabled { background: #86efac; cursor: default; }
</style>
