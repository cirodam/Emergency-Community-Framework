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
    <div class="page-header">
        <button class="back-btn" onclick={() => currentPage.go("inbox")}>‹ Inbox</button>
    </div>

    <div class="compose-card">
        <div class="compose-title">New Message</div>

        {#if error}
            <div class="error-banner">{error}</div>
        {/if}

        <form class="compose-form" onsubmit={(e) => { e.preventDefault(); send(); }}>
            <div class="field-row">
                <span class="field-label">To</span>
                <input
                    class="field-input"
                    type="text"
                    bind:value={toPersonId}
                    placeholder="Person ID or @handle"
                    autocapitalize="none"
                    spellcheck={false}
                    disabled={sending}
                    required
                />
            </div>

            <div class="field-divider"></div>

            <div class="field-row">
                <span class="field-label">Subject</span>
                <input
                    class="field-input"
                    type="text"
                    bind:value={subject}
                    placeholder="(no subject)"
                    disabled={sending}
                />
            </div>

            <div class="field-divider body-start"></div>

            <textarea
                class="body-input"
                bind:value={body}
                placeholder="Write your message…"
                rows={12}
                disabled={sending}
                required
            ></textarea>

            <div class="compose-actions">
                <button
                    type="button"
                    class="discard-btn"
                    onclick={() => currentPage.go("inbox")}
                    disabled={sending}
                >Discard</button>
                <button
                    class="send-btn"
                    type="submit"
                    disabled={sending || !toPersonId.trim() || !body.trim()}
                >
                    {sending ? "Sending…" : "Send"}
                </button>
            </div>
        </form>
    </div>
</div>

<style>
    .page {
        max-width: 760px;
        margin: 0 auto;
        padding: 0 0 4rem;
    }

    .page-header {
        padding: 1.25rem 1.5rem 1rem;
        border-bottom: 1px solid #e2e8f0;
    }

    .back-btn {
        background: none;
        border: none;
        font-size: 0.8rem;
        color: #16a34a;
        cursor: pointer;
        padding: 0;
        font-weight: 600;
        font-family: inherit;
    }

    .compose-card {
        margin: 1.25rem 1.5rem;
        border: 1px solid #e2e8f0;
        border-radius: 0.75rem;
        background: #fff;
        overflow: hidden;
    }

    .compose-title {
        padding: 0.875rem 1.25rem;
        font-size: 0.95rem;
        font-weight: 700;
        color: #0f172a;
        background: #f8fafc;
        border-bottom: 1px solid #e2e8f0;
    }

    .error-banner {
        background: #fee2e2;
        color: #991b1b;
        padding: 0.75rem 1.25rem;
        font-size: 0.875rem;
        border-bottom: 1px solid #fecaca;
    }

    .compose-form {
        display: flex;
        flex-direction: column;
    }

    .field-row {
        display: flex;
        align-items: center;
        padding: 0.7rem 1.25rem;
        gap: 0.75rem;
    }

    .field-label {
        font-size: 0.8rem;
        font-weight: 600;
        color: #64748b;
        width: 4.5rem;
        flex-shrink: 0;
    }

    .field-input {
        flex: 1;
        border: none;
        outline: none;
        font-size: 0.9rem;
        font-family: inherit;
        color: #0f172a;
        background: transparent;
        padding: 0;
    }
    .field-input::placeholder { color: #cbd5e1; }

    .field-divider {
        height: 1px;
        background: #f1f5f9;
        margin: 0 1.25rem;
    }
    .field-divider.body-start { margin: 0; }

    .body-input {
        resize: none;
        border: none;
        outline: none;
        font-size: 0.9rem;
        font-family: inherit;
        color: #0f172a;
        background: transparent;
        padding: 1rem 1.25rem;
        line-height: 1.7;
        min-height: 14rem;
    }
    .body-input::placeholder { color: #cbd5e1; }

    .compose-actions {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 0.75rem;
        padding: 0.75rem 1.25rem;
        border-top: 1px solid #f1f5f9;
        background: #fafafa;
    }

    .discard-btn {
        background: none;
        border: 1px solid #e2e8f0;
        color: #64748b;
        padding: 0.5rem 1rem;
        border-radius: 0.5rem;
        font-size: 0.875rem;
        font-family: inherit;
        cursor: pointer;
        transition: background 0.1s;
    }
    .discard-btn:hover:not(:disabled) { background: #f1f5f9; }

    .send-btn {
        padding: 0.5rem 1.5rem;
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
</style>

