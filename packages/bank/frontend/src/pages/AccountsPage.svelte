<script lang="ts">
    import { session, currentPage, selectedAccountHandle } from "../lib/session.js";
    import { getMyAccounts, createMyAccount, deleteMyAccount, renameMyAccount } from "../lib/api.js";
    import type { AccountDto } from "../lib/api.js";
    import ErrorBanner from "../components/ErrorBanner.svelte";

    const MAX_ACCOUNTS = 10;
    const s = $derived($session!);

    let accounts: AccountDto[] = $state([]);
    let loading  = $state(true);
    let error    = $state("");

    async function load() {
        loading = true; error = "";
        try { accounts = await getMyAccounts(); }
        catch (e) { error = e instanceof Error ? e.message : "Failed to load accounts"; }
        finally   { loading = false; }
    }

    $effect(() => { load(); });

    function viewAccount(a: AccountDto) {
        selectedAccountHandle.set(a.handle);
        currentPage.go("account");
    }

    // ── Rename ─────────────────────────────────────────────────────────────
    let renamingHandle = $state<string | null>(null);
    let renameValue    = $state("");
    let renameError    = $state("");

    function startRename(a: AccountDto, e: Event) {
        e.stopPropagation();
        renamingHandle = a.handle; renameValue = a.label; renameError = "";
    }

    async function commitRename(a: AccountDto) {
        const trimmed = renameValue.trim();
        if (!trimmed || trimmed === a.label) { renamingHandle = null; return; }
        try {
            const updated = await renameMyAccount(a.handle, trimmed);
            accounts = accounts.map(x => x.handle === a.handle ? updated : x);
        } catch (e) {
            renameError = e instanceof Error ? e.message : "Rename failed";
        } finally { renamingHandle = null; }
    }

    // ── Delete ─────────────────────────────────────────────────────────────
    let confirmingDeleteHandle = $state<string | null>(null);
    let deleteError             = $state("");

    function startDelete(a: AccountDto, e: Event) {
        e.stopPropagation();
        if (a.amount !== 0) {
            deleteError            = `"${a.label}" has a balance of ${a.amount} — transfer funds away first.`;
            confirmingDeleteHandle = a.handle;
            return;
        }
        deleteError = ""; confirmingDeleteHandle = a.handle;
    }

    async function executeDelete(a: AccountDto) {
        try {
            await deleteMyAccount(a.handle);
            accounts = accounts.filter(x => x.handle !== a.handle);
            if ($selectedAccountHandle === a.handle) selectedAccountHandle.set("");
        } catch (e) {
            deleteError = e instanceof Error ? e.message : "Delete failed";
        } finally { confirmingDeleteHandle = null; }
    }

    // ── Add ────────────────────────────────────────────────────────────────
    let addOpen    = $state(false);
    let newLabel   = $state("");
    let addError   = $state("");
    let addLoading = $state(false);

    async function addAccount() {
        const trimmed = newLabel.trim();
        if (!trimmed) return;
        addError = ""; addLoading = true;
        try {
            const created = await createMyAccount(trimmed);
            accounts = [...accounts, created];
            addOpen = false; newLabel = "";
        } catch (e) {
            addError = e instanceof Error ? e.message : "Failed to create account";
        } finally { addLoading = false; }
    }

    function formatBalance(a: AccountDto): string {
        return a.amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    }
</script>

<div class="page">
    <header class="page-header">
        <div class="header-left">
            <div class="bank-brand">◈ Bank</div>
            <h1 class="page-title">My Accounts</h1>
        </div>
        <div class="header-right">
            <button class="icon-btn" onclick={load} disabled={loading} aria-label="Refresh">↻</button>
            <button class="icon-btn" onclick={() => currentPage.go("settings")} aria-label="Settings">⚙</button>
        </div>
    </header>

    <ErrorBanner message={error} />

    {#if loading && accounts.length === 0}
        {#each [1, 2] as _}
            <div class="skeleton-card"></div>
        {/each}
    {:else if accounts.length === 0 && !loading}
        <div class="empty-state">
            <div class="empty-icon">◈</div>
            <p>No accounts found. Try refreshing.</p>
        </div>
    {:else}
        <div class="account-cards">
            {#each accounts as a (a.handle)}
                <!-- Rename overlay -->
                {#if renamingHandle === a.handle}
                    <div class="account-card renaming">
                        <input
                            class="rename-input"
                            type="text"
                            bind:value={renameValue}
                            onkeydown={(e) => { if (e.key === "Enter") commitRename(a); if (e.key === "Escape") renamingHandle = null; }}
                            onblur={() => commitRename(a)}
                        />
                        {#if renameError}<p class="inline-error">{renameError}</p>{/if}
                    </div>
                <!-- Delete confirm overlay -->
                {:else if confirmingDeleteHandle === a.handle}
                    <div class="account-card confirm-card">
                        {#if deleteError}
                            <p class="inline-error">{deleteError}</p>
                            <button class="btn-sm" onclick={() => { confirmingDeleteHandle = null; deleteError = ""; }}>OK</button>
                        {:else}
                            <p class="confirm-text">Close <strong>"{a.label}"</strong>?</p>
                            <div class="confirm-row">
                                <button class="btn-sm" onclick={() => confirmingDeleteHandle = null}>Cancel</button>
                                <button class="btn-sm danger" onclick={() => executeDelete(a)}>Close account</button>
                            </div>
                        {/if}
                    </div>
                {:else}
                    <div class="account-card" onclick={() => viewAccount(a)} role="button" tabindex="0"
                        onkeydown={(e) => e.key === "Enter" && viewAccount(a)}>
                        <div class="card-main">
                            <div class="card-label">{a.label}</div>
                            <div class="card-balance">
                                <span class="balance-amount">{formatBalance(a)}</span>
                                <span class="balance-currency">{a.currency}</span>
                            </div>
                            <div class="card-meta">@{a.handle}</div>
                        </div>
                        <div class="card-actions" onclick={(e) => e.stopPropagation()} role="none">
                            <button class="card-action-btn" onclick={(e) => startRename(a, e)} title="Rename">✎</button>
                            <button
                                class="card-action-btn danger"
                                onclick={(e) => startDelete(a, e)}
                                title="Close account"
                                disabled={accounts.length <= 1}
                            >✕</button>
                            <span class="view-arrow">›</span>
                        </div>
                    </div>
                {/if}
            {/each}
        </div>
    {/if}

    <!-- Add account -->
    {#if addOpen}
        <div class="add-form">
            <input
                class="add-input"
                type="text"
                placeholder="Account name…"
                bind:value={newLabel}
                disabled={addLoading}
                onkeydown={(e) => { if (e.key === "Enter") addAccount(); if (e.key === "Escape") addOpen = false; }}
            />
            {#if addError}<p class="inline-error">{addError}</p>{/if}
            <div class="add-row">
                <button class="btn-sm" onclick={() => addOpen = false} disabled={addLoading}>Cancel</button>
                <button class="btn-sm primary" onclick={addAccount} disabled={addLoading || !newLabel.trim()}>
                    {addLoading ? "Creating…" : "Create"}
                </button>
            </div>
        </div>
    {:else if accounts.length < MAX_ACCOUNTS}
        <button class="add-btn" onclick={() => { addOpen = true; newLabel = ""; addError = ""; }}>
            + New Account
        </button>
    {/if}
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

    /* ── Header ─────────────────────────────────────────────────────────── */

    .page-header {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        margin-bottom: 1.75rem;
    }

    .bank-brand {
        font-size: 0.75rem;
        font-weight: 700;
        color: #2563eb;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        margin-bottom: 0.2rem;
    }

    .page-title {
        font-size: 1.5rem;
        font-weight: 700;
        color: #0f172a;
        margin: 0;
    }

    .header-right {
        display: flex;
        gap: 0.5rem;
        align-items: center;
    }

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

    /* ── Account cards ───────────────────────────────────────────────────── */

    .account-cards {
        display: flex;
        flex-direction: column;
        gap: 0.875rem;
        margin-bottom: 1.25rem;
    }

    .account-card {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        background: #fff;
        border: 1.5px solid #e2e8f0;
        border-radius: 16px;
        padding: 1.25rem 1.25rem 1.25rem 1.5rem;
        cursor: pointer;
        transition: border-color 0.15s, box-shadow 0.15s;
    }
    .account-card:hover {
        border-color: #93c5fd;
        box-shadow: 0 2px 8px rgba(37, 99, 235, 0.08);
    }
    .account-card:focus-visible { outline: 2px solid #2563eb; outline-offset: 2px; }

    .account-card.renaming,
    .account-card.confirm-card {
        flex-direction: column;
        align-items: flex-start;
        cursor: default;
    }
    .account-card.renaming:hover,
    .account-card.confirm-card:hover {
        border-color: #e2e8f0;
        box-shadow: none;
    }

    .card-main {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        flex: 1;
        min-width: 0;
    }

    .card-label {
        font-size: 0.8rem;
        font-weight: 600;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.06em;
    }

    .card-balance {
        display: flex;
        align-items: baseline;
        gap: 0.35rem;
    }

    .balance-amount {
        font-size: 1.75rem;
        font-weight: 700;
        font-variant-numeric: tabular-nums;
        color: #0f172a;
    }

    .balance-currency {
        font-size: 0.75rem;
        font-weight: 500;
        color: #94a3b8;
        text-transform: uppercase;
        letter-spacing: 0.04em;
    }

    .card-meta {
        font-size: 0.72rem;
        color: #cbd5e1;
        font-variant-numeric: tabular-nums;
        margin-top: 0.1rem;
    }

    .card-actions {
        display: flex;
        align-items: center;
        gap: 0.15rem;
        flex-shrink: 0;
    }

    .card-action-btn {
        background: none;
        border: none;
        font-size: 0.85rem;
        cursor: pointer;
        color: #cbd5e1;
        padding: 0.3rem;
        border-radius: 6px;
        line-height: 1;
        transition: color 0.1s, background 0.1s;
        font-family: inherit;
    }
    .card-action-btn:hover        { color: #475569; background: #f1f5f9; }
    .card-action-btn.danger:hover { color: #dc2626; background: #fee2e2; }
    .card-action-btn:disabled     { opacity: 0.3; cursor: default; }
    .card-action-btn.danger:disabled:hover { color: #cbd5e1; background: none; }

    .view-arrow {
        font-size: 1.4rem;
        color: #cbd5e1;
        margin-left: 0.25rem;
        line-height: 1;
    }

    /* ── Rename input ────────────────────────────────────────────────────── */

    .rename-input {
        width: 100%;
        border: none;
        border-bottom: 2px solid #2563eb;
        outline: none;
        font-size: 1.1rem;
        font-weight: 600;
        font-family: inherit;
        color: #0f172a;
        background: transparent;
        padding: 0.2rem 0;
        box-sizing: border-box;
    }

    /* ── Delete confirm ──────────────────────────────────────────────────── */

    .confirm-text { font-size: 0.9rem; color: #374151; margin: 0 0 0.6rem; }

    .confirm-row {
        display: flex;
        gap: 0.5rem;
    }

    /* ── Add ─────────────────────────────────────────────────────────────── */

    .add-btn {
        width: 100%;
        padding: 0.9rem;
        background: none;
        border: 1.5px dashed #cbd5e1;
        border-radius: 14px;
        font-size: 0.9rem;
        font-weight: 600;
        color: #94a3b8;
        cursor: pointer;
        font-family: inherit;
        transition: border-color 0.15s, color 0.15s;
    }
    .add-btn:hover { border-color: #2563eb; color: #2563eb; }

    .add-form {
        background: #f8fafc;
        border: 1.5px solid #e2e8f0;
        border-radius: 14px;
        padding: 1rem 1.25rem;
        display: flex;
        flex-direction: column;
        gap: 0.6rem;
    }

    .add-input {
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        padding: 0.6rem 0.875rem;
        font-size: 0.95rem;
        font-family: inherit;
        outline: none;
        width: 100%;
        box-sizing: border-box;
    }
    .add-input:focus { border-color: #2563eb; }

    .add-row {
        display: flex;
        gap: 0.5rem;
        justify-content: flex-end;
    }

    /* ── Shared small buttons ────────────────────────────────────────────── */

    .btn-sm {
        background: none;
        border: 1px solid #e2e8f0;
        color: #64748b;
        padding: 0.35rem 0.8rem;
        border-radius: 7px;
        font-size: 0.82rem;
        font-family: inherit;
        cursor: pointer;
        transition: background 0.1s;
    }
    .btn-sm:hover:not(:disabled) { background: #f1f5f9; }
    .btn-sm:disabled { opacity: 0.5; cursor: default; }

    .btn-sm.primary {
        background: #2563eb;
        border-color: #2563eb;
        color: #fff;
    }
    .btn-sm.primary:hover:not(:disabled) { background: #1d4ed8; }

    .btn-sm.danger {
        background: #dc2626;
        border-color: #dc2626;
        color: #fff;
    }
    .btn-sm.danger:hover { background: #b91c1c; }

    /* ── Misc ────────────────────────────────────────────────────────────── */

    .inline-error { font-size: 0.8rem; color: #dc2626; margin: 0; }

    .skeleton-card {
        height: 7rem;
        border-radius: 16px;
        margin-bottom: 0.875rem;
        background: linear-gradient(90deg, #f8fafc 25%, #f1f5f9 50%, #f8fafc 75%);
        background-size: 200% 100%;
        animation: shimmer 1.3s infinite;
    }
    @keyframes shimmer {
        0%   { background-position: 200% 0; }
        100% { background-position: -200% 0; }
    }

    .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.75rem;
        padding: 5rem 0;
        color: #94a3b8;
    }
    .empty-icon { font-size: 2.5rem; color: #cbd5e1; }
    .empty-state p { margin: 0; font-size: 0.95rem; }
</style>
