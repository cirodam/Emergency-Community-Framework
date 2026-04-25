<script lang="ts">
    import AmountDisplay from "../components/AmountDisplay.svelte";
    import ErrorBanner from "../components/ErrorBanner.svelte";
    import { session, currentPage } from "../lib/session.js";
    import { sendTransfer, getAccountById } from "../lib/api.js";

    const s = $derived($session!);

    let toAccountId = $state("");
    let amount      = $state("");
    let memo        = $state("");
    let error       = $state("");
    let success     = $state(false);
    let loading     = $state(false);

    async function submit() {
        error = "";
        const amt = parseFloat(amount);
        if (!toAccountId.trim()) { error = "Enter a recipient account ID"; return; }
        if (isNaN(amt) || amt <= 0) { error = "Enter a valid amount"; return; }

        loading = true;
        try {
            await sendTransfer(s.primaryAccountId, toAccountId.trim(), amt, memo.trim());
            success = true;
            toAccountId = "";
            amount = "";
            memo = "";
        } catch (e) {
            error = e instanceof Error ? e.message : "Transfer failed";
        } finally {
            loading = false;
        }
    }
</script>

<div class="send-page">
    <h2 class="page-title">Send</h2>

    {#if success}
        <div class="success-card">
            <div class="success-icon">✓</div>
            <p>Transfer sent!</p>
            <button class="btn-secondary" onclick={() => { success = false; currentPage.go("account"); }}>
                Back to account
            </button>
            <button class="btn-link" onclick={() => success = false}>Send another</button>
        </div>
    {:else}
        <ErrorBanner message={error} />

        <form onsubmit={(e) => { e.preventDefault(); submit(); }}>
            <label class="field">
                <span>Recipient account ID</span>
                <input
                    type="text"
                    bind:value={toAccountId}
                    placeholder="Paste account ID"
                    autocomplete="off"
                    spellcheck={false}
                    disabled={loading}
                />
            </label>

            <label class="field">
                <span>Amount (kin)</span>
                <input
                    type="number"
                    bind:value={amount}
                    placeholder="0"
                    min="0.01"
                    step="0.01"
                    inputmode="decimal"
                    disabled={loading}
                />
            </label>

            <label class="field">
                <span>Memo <small>(optional)</small></span>
                <input
                    type="text"
                    bind:value={memo}
                    placeholder="What's this for?"
                    disabled={loading}
                />
            </label>

            <button type="submit" class="btn-primary" disabled={loading}>
                {loading ? "Sending…" : "Send"}
            </button>
        </form>
    {/if}
</div>

<style>
    .send-page {
        padding: 1.5rem 1.5rem 6rem;
        max-width: 480px;
        margin: 0 auto;
    }

    .page-title { font-size: 1.4rem; font-weight: 700; color: #0f172a; margin: 0 0 1.5rem; }

    .field { display: flex; flex-direction: column; gap: 0.4rem; margin-bottom: 1.1rem; }

    .field span { font-size: 0.85rem; font-weight: 500; color: #475569; }

    .field small { font-weight: 400; opacity: 0.6; }

    .field input {
        border: 1px solid #cbd5e1;
        border-radius: 10px;
        font-size: 1rem;
        padding: 0.75rem 1rem;
        outline: none;
        transition: border-color 0.15s;
    }

    .field input:focus { border-color: #2563eb; }

    .btn-primary {
        width: 100%;
        padding: 0.9rem;
        background: #2563eb;
        color: #fff;
        border: none;
        border-radius: 12px;
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        margin-top: 0.5rem;
        transition: background 0.15s;
    }

    .btn-primary:disabled { background: #93c5fd; cursor: default; }
    .btn-primary:not(:disabled):active { background: #1d4ed8; }

    .success-card {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1rem;
        padding: 3rem 1rem;
        text-align: center;
    }

    .success-icon {
        width: 4rem;
        height: 4rem;
        border-radius: 50%;
        background: #dcfce7;
        color: #16a34a;
        font-size: 1.8rem;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .success-card p { font-size: 1.2rem; font-weight: 600; margin: 0; }

    .btn-secondary {
        padding: 0.75rem 2rem;
        background: #f1f5f9;
        border: none;
        border-radius: 10px;
        font-size: 0.95rem;
        font-weight: 500;
        cursor: pointer;
    }

    .btn-link {
        background: none;
        border: none;
        color: #2563eb;
        font-size: 0.9rem;
        cursor: pointer;
        text-decoration: underline;
    }
</style>
