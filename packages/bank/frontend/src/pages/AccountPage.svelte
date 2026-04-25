<script lang="ts">
    import AmountDisplay from "../components/AmountDisplay.svelte";
    import ErrorBanner from "../components/ErrorBanner.svelte";
    import { session, currentPage } from "../lib/session.js";
    import { getAccountById } from "../lib/api.js";
    import type { AccountDto } from "../lib/api.js";

    let account: AccountDto | null = $state(null);
    let error = $state("");
    let loading = $state(true);

    const s = $derived($session!);

    async function load() {
        loading = true;
        error = "";
        try {
            account = await getAccountById(s.primaryAccountId);
        } catch (e) {
            error = e instanceof Error ? e.message : "Failed to load account";
        } finally {
            loading = false;
        }
    }

    $effect(() => { load(); });
</script>

<div class="account-page">
    <header class="account-header">
        <div class="greeting">Hello, {s.displayName.split(" ")[0]}</div>
        <button class="refresh-btn" onclick={load} aria-label="Refresh" disabled={loading}>↻</button>
    </header>

    <ErrorBanner message={error} />

    {#if loading && !account}
        <div class="skeleton-balance"></div>
    {:else if account}
        <div class="balance-card">
            <div class="balance-label">Balance</div>
            <AmountDisplay amount={account.amount} currency={account.currency} size="lg" />
            <div class="account-id">{account.accountId.slice(0, 8)}…</div>
        </div>
    {/if}

    <div class="quick-actions">
        <button class="action-btn" onclick={() => currentPage.go("send")}>
            <span class="action-icon">↑</span>
            Send
        </button>
        <button class="action-btn" onclick={() => currentPage.go("history")}>
            <span class="action-icon">≡</span>
            History
        </button>
    </div>
</div>

<style>
    .account-page {
        padding: 1.5rem 1.5rem 6rem;
        max-width: 480px;
        margin: 0 auto;
    }

    .account-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.5rem;
    }

    .greeting { font-size: 1.2rem; font-weight: 600; color: #0f172a; }

    .refresh-btn {
        background: none;
        border: none;
        font-size: 1.3rem;
        cursor: pointer;
        color: #64748b;
        padding: 0.25rem;
    }

    .refresh-btn:disabled { opacity: 0.4; }

    .balance-card {
        background: #2563eb;
        color: #fff;
        border-radius: 20px;
        padding: 2rem 1.5rem;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        margin-bottom: 2rem;
        min-height: 10rem;
        justify-content: center;
    }

    .balance-label { font-size: 0.85rem; opacity: 0.75; text-transform: uppercase; letter-spacing: 0.06em; }

    .account-id { font-size: 0.75rem; opacity: 0.5; font-variant-numeric: tabular-nums; margin-top: 0.5rem; }

    .skeleton-balance {
        background: #e2e8f0;
        border-radius: 20px;
        height: 10rem;
        margin-bottom: 2rem;
        animation: pulse 1.4s ease-in-out infinite;
    }

    @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
    }

    .quick-actions {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
    }

    .action-btn {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.4rem;
        padding: 1.25rem;
        background: #f1f5f9;
        border: none;
        border-radius: 16px;
        font-size: 0.9rem;
        font-weight: 600;
        cursor: pointer;
        color: #0f172a;
        transition: background 0.15s;
    }

    .action-btn:active { background: #e2e8f0; }

    .action-icon { font-size: 1.5rem; }
</style>
