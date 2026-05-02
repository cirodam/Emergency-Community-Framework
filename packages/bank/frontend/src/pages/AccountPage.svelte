<script lang="ts">
    import { session, currentPage, selectedAccountHandle } from "../lib/session.js";
    import { getMyAccountByHandle, getMyAccountTransactions, getMyAccounts, sendTransferByAddress } from "../lib/api.js";
    import type { AccountDto, TransactionDto } from "../lib/api.js";
    import AmountDisplay from "../components/AmountDisplay.svelte";
    import TransactionRow from "../components/TransactionRow.svelte";
    import ErrorBanner from "../components/ErrorBanner.svelte";

    const s = $derived($session!);
    const accountHandle = $derived($selectedAccountHandle || s.primaryAccountHandle);

    let account: AccountDto | null = $state(null);
    let loadError = $state("");
    let loadingAccount = $state(true);

    // Transactions
    let txs: TransactionDto[] = $state([]);
    let txError   = $state("");
    let txLoading = $state(false);

    function monthOptions() {
        const opts = [{ value: "", label: "All time" }];
        const now = new Date();
        for (let i = 0; i < 12; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
            const label = d.toLocaleDateString(undefined, { year: "numeric", month: "long" });
            opts.push({ value, label });
        }
        return opts;
    }
    const months = monthOptions();
    let selectedMonth = $state(months[1]?.value ?? "");

    async function loadAccount() {
        if (!accountHandle) return;
        loadingAccount = true; loadError = "";
        try { account = await getMyAccountByHandle(accountHandle); }
        catch (e) { loadError = e instanceof Error ? e.message : "Failed to load account"; }
        finally   { loadingAccount = false; }
    }

    async function loadTxs() {
        if (!accountHandle) return;
        txLoading = true; txError = "";
        try {
            const raw = await getMyAccountTransactions(accountHandle, selectedMonth || undefined);
            txs = raw.slice().sort((a, b) => b.timestamp.localeCompare(a.timestamp));
        } catch (e) {
            txError = e instanceof Error ? e.message : "Failed to load transactions";
        } finally {
            txLoading = false;
        }
    }

    $effect(() => { accountHandle; loadAccount(); });
    $effect(() => { accountHandle; selectedMonth; loadTxs(); });

    // ── Move funds (between own accounts) ─────────────────────────────────
    let showMove        = $state(false);
    let ownAccounts     = $state<AccountDto[]>([]);
    let moveToHandle    = $state("");
    let moveAmount      = $state("");
    let moveError       = $state("");
    let moving          = $state(false);
    let moveSuccess     = $state(false);

    async function toggleMove() {
        showMove = !showMove;
        if (showMove) {
            moveError = ""; moveSuccess = false; moveAmount = "";
            if (ownAccounts.length === 0) {
                const all = await getMyAccounts();
                ownAccounts = all.filter(a => a.handle !== accountHandle);
            }
            if (ownAccounts.length > 0 && !moveToHandle) moveToHandle = ownAccounts[0].handle;
        }
    }

    async function doMove() {
        const amt = parseFloat(moveAmount);
        if (!moveToHandle) { moveError = "Select a destination account"; return; }
        if (isNaN(amt) || amt <= 0) { moveError = "Enter a valid amount"; return; }
        moving = true; moveError = "";
        try {
            // Move between own accounts: address is just the target account handle
            await sendTransferByAddress(moveToHandle, amt, "transfer between accounts");
            account = await getMyAccountByHandle(accountHandle);
            await loadTxs();
            moveSuccess = true;
            moveAmount = "";
        } catch (e) {
            moveError = e instanceof Error ? e.message : "Transfer failed";
        } finally {
            moving = false;
        }
    }
</script>

<div class="page">
    <!-- Back nav -->
    <div class="top-bar">
        <button class="back-btn" onclick={() => currentPage.go("accounts")}>‹ Accounts</button>
        <button class="icon-btn" onclick={() => { loadAccount(); loadTxs(); }} disabled={loadingAccount || txLoading} aria-label="Refresh">↻</button>
    </div>

    <ErrorBanner message={loadError} />

    <!-- Balance card -->
    {#if loadingAccount && !account}
        <div class="skeleton-card"></div>
    {:else if account}
        <div class="balance-card">
            <div class="balance-card-label">{account.label}</div>
            <AmountDisplay amount={account.amount} currency={account.currency} size="lg" />
            <div class="balance-card-id">@{account.handle} · {account.currency}</div>
        </div>
    {/if}

    <!-- Action buttons -->
    <div class="action-row">
        <button class="action-btn" onclick={() => currentPage.go("send")}>
            <span class="action-icon">↑</span>
            <span>Send</span>
        </button>
        <button class="action-btn" class:active={showMove} onclick={toggleMove} disabled={!account}>
            <span class="action-icon">⇌</span>
            <span>Move</span>
        </button>
    </div>

    <!-- Move funds panel -->
    {#if showMove}
        <div class="move-panel">
            <div class="move-header">Move funds to another account</div>
            {#if ownAccounts.length === 0}
                <p class="move-empty">You only have one account. Create another account to move funds between them.</p>
            {:else}
                {#if moveSuccess}
                    <div class="move-success">✓ Transfer complete!</div>
                {/if}
                {#if moveError}
                    <p class="inline-error">{moveError}</p>
                {/if}
                <div class="move-fields">
                    <div class="move-field">
                        <label class="field-label" for="move-to">To account</label>
                        <select id="move-to" class="move-select" bind:value={moveToHandle} disabled={moving}>
                            {#each ownAccounts as a (a.handle)}
                                <option value={a.handle}>{a.label} ({a.amount.toLocaleString()} {a.currency})</option>
                            {/each}
                        </select>
                    </div>
                    <div class="move-field">
                        <label class="field-label" for="move-amt">Amount</label>
                        <input
                            id="move-amt"
                            class="move-input"
                            type="number"
                            bind:value={moveAmount}
                            placeholder="0"
                            min="0.01"
                            step="0.01"
                            inputmode="decimal"
                            disabled={moving}
                        />
                    </div>
                    <button class="move-btn" onclick={doMove} disabled={moving || !moveAmount}>
                        {moving ? "Moving…" : "Move"}
                    </button>
                </div>
            {/if}
        </div>
    {/if}

    <!-- Transactions -->
    <div class="tx-section">
        <div class="tx-header">
            <span class="tx-title">Transactions</span>
            <select class="month-select" bind:value={selectedMonth} disabled={txLoading}>
                {#each months as m}
                    <option value={m.value}>{m.label}</option>
                {/each}
            </select>
        </div>

        {#if txError}
            <p class="inline-error">{txError}</p>
        {:else if txLoading}
            {#each [1,2,3,4] as _}
                <div class="tx-skeleton"></div>
            {/each}
        {:else if txs.length === 0}
            <div class="tx-empty">No transactions{selectedMonth ? " this month" : ""}.</div>
        {:else}
            <div class="tx-list">
                {#each txs as tx (tx.id)}
                    <TransactionRow {tx} perspectiveAccountHandle={accountHandle} />
                {/each}
            </div>
        {/if}
    </div>
</div>

<style>
    .page {
        padding: 1.5rem 1.5rem 6rem;
        max-width: 520px;
        margin: 0 auto;
    }

    @media (min-width: 768px) {
        .page { padding-bottom: 2rem; max-width: 640px; }
    }

    /* ── Top bar ─────────────────────────────────────────────────────────── */

    .top-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 1.5rem;
    }

    .back-btn {
        background: none;
        border: none;
        font-size: 0.9rem;
        font-weight: 600;
        color: #2563eb;
        cursor: pointer;
        padding: 0;
        font-family: inherit;
    }
    .back-btn:hover { text-decoration: underline; }

    .icon-btn {
        background: none;
        border: none;
        font-size: 1.15rem;
        cursor: pointer;
        color: #64748b;
        padding: 0.35rem;
        border-radius: 8px;
        transition: background 0.1s;
        font-family: inherit;
        line-height: 1;
    }
    .icon-btn:hover:not(:disabled)   { background: #f1f5f9; color: #0f172a; }
    .icon-btn:disabled { opacity: 0.4; }

    /* ── Balance card ────────────────────────────────────────────────────── */

    .balance-card {
        background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 60%, #3b82f6 100%);
        color: #fff;
        border-radius: 20px;
        padding: 2rem 1.75rem;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        margin-bottom: 1.25rem;
        min-height: 9rem;
        justify-content: center;
        box-shadow: 0 4px 20px rgba(37, 99, 235, 0.25);
    }

    .balance-card-label {
        font-size: 0.8rem;
        opacity: 0.7;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        font-weight: 600;
    }

    .balance-card-id {
        font-size: 0.72rem;
        opacity: 0.45;
        font-variant-numeric: tabular-nums;
        margin-top: 0.25rem;
    }

    .skeleton-card {
        height: 9rem;
        border-radius: 20px;
        margin-bottom: 1.25rem;
        background: linear-gradient(90deg, #e2e8f0 25%, #cbd5e1 50%, #e2e8f0 75%);
        background-size: 200% 100%;
        animation: shimmer 1.3s infinite;
    }
    @keyframes shimmer {
        0%   { background-position: 200% 0; }
        100% { background-position: -200% 0; }
    }

    /* ── Action buttons ──────────────────────────────────────────────────── */

    .action-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.75rem;
        margin-bottom: 1.25rem;
    }

    .action-btn {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.35rem;
        padding: 1.1rem;
        background: #f1f5f9;
        border: 1.5px solid transparent;
        border-radius: 14px;
        font-size: 0.875rem;
        font-weight: 600;
        color: #374151;
        cursor: pointer;
        font-family: inherit;
        transition: background 0.15s, border-color 0.15s;
    }
    .action-btn:hover:not(:disabled) { background: #e2e8f0; }
    .action-btn.active { background: #eff6ff; border-color: #93c5fd; color: #2563eb; }
    .action-btn:disabled { opacity: 0.4; cursor: default; }

    .action-icon { font-size: 1.3rem; line-height: 1; }

    /* ── Move panel ──────────────────────────────────────────────────────── */

    .move-panel {
        background: #f8fafc;
        border: 1.5px solid #e2e8f0;
        border-radius: 14px;
        padding: 1.1rem 1.25rem;
        margin-bottom: 1.25rem;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    .move-header {
        font-size: 0.82rem;
        font-weight: 700;
        color: #374151;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    .move-fields {
        display: flex;
        flex-direction: column;
        gap: 0.6rem;
    }

    .move-field {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
    }

    .field-label {
        font-size: 0.78rem;
        font-weight: 600;
        color: #64748b;
    }

    .move-select,
    .move-input {
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        padding: 0.55rem 0.75rem;
        font-size: 0.9rem;
        font-family: inherit;
        outline: none;
        background: #fff;
        width: 100%;
        box-sizing: border-box;
    }
    .move-select:focus,
    .move-input:focus { border-color: #2563eb; }

    .move-btn {
        align-self: flex-end;
        background: #2563eb;
        border: none;
        color: #fff;
        padding: 0.5rem 1.25rem;
        border-radius: 8px;
        font-size: 0.875rem;
        font-weight: 600;
        font-family: inherit;
        cursor: pointer;
        transition: background 0.15s;
    }
    .move-btn:hover:not(:disabled) { background: #1d4ed8; }
    .move-btn:disabled { background: #93c5fd; cursor: default; }

    .move-success {
        font-size: 0.875rem;
        font-weight: 600;
        color: #16a34a;
    }

    .move-empty {
        font-size: 0.85rem;
        color: #64748b;
        margin: 0;
    }

    .inline-error { font-size: 0.8rem; color: #dc2626; margin: 0; }

    /* ── Transactions ────────────────────────────────────────────────────── */

    .tx-section { margin-top: 0.5rem; }

    .tx-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding-bottom: 0.6rem;
        border-bottom: 1px solid #e2e8f0;
        margin-bottom: 0;
    }

    .tx-title {
        font-size: 0.8rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.07em;
        color: #64748b;
    }

    .month-select {
        border: 1px solid #e2e8f0;
        border-radius: 7px;
        padding: 0.3rem 0.6rem;
        font-size: 0.78rem;
        font-family: inherit;
        color: #374151;
        background: #fff;
        outline: none;
        cursor: pointer;
    }
    .month-select:focus { border-color: #2563eb; }

    .tx-list { display: flex; flex-direction: column; }

    .tx-skeleton {
        height: 3.25rem;
        border-bottom: 1px solid #f1f5f9;
        background: linear-gradient(90deg, #f8fafc 25%, #f1f5f9 50%, #f8fafc 75%);
        background-size: 200% 100%;
        animation: shimmer 1.3s infinite;
    }

    .tx-empty {
        text-align: center;
        color: #94a3b8;
        font-size: 0.875rem;
        padding: 2.5rem 0;
    }
</style>

