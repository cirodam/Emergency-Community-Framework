<script lang="ts">
    import { isTeller, isBankAdmin, currentPage } from "../lib/session.js";
    import { getAdminAccounts, adminReverseTransaction } from "../lib/api.js";
    import type { AccountDto } from "../lib/api.js";
    import ErrorBanner from "../components/ErrorBanner.svelte";

    // ── Accounts list (teller view) ────────────────────────────────────────
    let accounts: AccountDto[] = $state([]);
    let loading  = $state(true);
    let loadErr  = $state("");
    let search   = $state("");

    const filtered = $derived(
        search.trim()
            ? accounts.filter(a =>
                a.ownerId.includes(search) ||
                a.label.toLowerCase().includes(search.toLowerCase()) ||
                a.accountId.includes(search)
            )
            : accounts
    );

    async function loadAccounts() {
        loading = true; loadErr = "";
        try { accounts = await getAdminAccounts(); }
        catch (e) { loadErr = e instanceof Error ? e.message : "Failed to load accounts"; }
        finally   { loading = false; }
    }

    $effect(() => { loadAccounts(); });

    // ── Transaction reversal (bank admin only) ─────────────────────────────
    let reverseTxId  = $state("");
    let reverseMemo  = $state("");
    let reverseErr   = $state("");
    let reverseDone  = $state("");
    let reversing    = $state(false);

    async function doReverse() {
        reverseErr = ""; reverseDone = "";
        const txId = reverseTxId.trim();
        if (!txId) { reverseErr = "Transaction ID is required"; return; }
        reversing = true;
        try {
            const rev = await adminReverseTransaction(txId, reverseMemo.trim() || undefined);
            reverseDone = `Reversal created: ${rev.id}`;
            reverseTxId = ""; reverseMemo = "";
            await loadAccounts(); // refresh balances
        } catch (e) {
            reverseErr = e instanceof Error ? e.message : "Reversal failed";
        } finally {
            reversing = false;
        }
    }
</script>

<div class="page">
    <header class="page-header">
        <button class="back-btn" onclick={() => currentPage.go("accounts")}>‹ Back</button>
        <h1 class="page-title">Admin</h1>
    </header>

    <!-- ── Accounts table (teller view) ────────────────────────────────── -->
    <section class="section">
        <h2 class="section-title">All Accounts</h2>
        <input
            class="search-input"
            type="search"
            placeholder="Search by owner ID, label, or account ID…"
            bind:value={search}
        />
        {#if loadErr}
            <ErrorBanner message={loadErr} />
        {:else if loading}
            <p class="hint">Loading…</p>
        {:else if filtered.length === 0}
            <p class="hint">No accounts found.</p>
        {:else}
            <div class="table-wrap">
                <table class="accounts-table">
                    <thead>
                        <tr>
                            <th>Owner</th>
                            <th>Label</th>
                            <th>Currency</th>
                            <th class="num">Balance</th>
                            <th>Account ID</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#each filtered as a (a.accountId)}
                            <tr>
                                <td class="mono small">{a.ownerId}</td>
                                <td>{a.label}</td>
                                <td>{a.currency}</td>
                                <td class="num" class:negative={a.amount < 0}>{a.amount.toLocaleString()}</td>
                                <td class="mono small">{a.accountId}</td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
            <p class="hint">{filtered.length} account{filtered.length === 1 ? "" : "s"}</p>
        {/if}
    </section>

    <!-- ── Transaction reversal (bank admin only) ──────────────────────── -->
    {#if $isBankAdmin}
        <section class="section">
            <h2 class="section-title">Reverse Transaction</h2>
            <p class="section-desc">
                Creates a new transaction that returns the funds to the original sender.
                Cannot be undone.
            </p>
            {#if reverseErr}<ErrorBanner message={reverseErr} />{/if}
            {#if reverseDone}<p class="success">{reverseDone}</p>{/if}
            <label class="field-label">Transaction ID
                <input
                    class="field-input mono"
                    type="text"
                    placeholder="uuid"
                    bind:value={reverseTxId}
                />
            </label>
            <label class="field-label">Memo (optional)
                <input
                    class="field-input"
                    type="text"
                    placeholder="Reason for reversal"
                    bind:value={reverseMemo}
                />
            </label>
            <button
                class="reverse-btn"
                onclick={doReverse}
                disabled={reversing || !reverseTxId.trim()}
            >
                {reversing ? "Reversing…" : "Reverse Transaction"}
            </button>
        </section>
    {/if}
</div>

<style>
    .page {
        max-width: 900px;
        margin: 0 auto;
        padding: 1.5rem 1rem 6rem;
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
        font-size: 1.1rem;
        color: #2563eb;
        cursor: pointer;
        padding: 0;
    }

    .page-title {
        margin: 0;
        font-size: 1.4rem;
        font-weight: 700;
    }

    .section {
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 0.75rem;
        padding: 1.25rem;
        margin-bottom: 1.5rem;
    }

    .section-title {
        margin: 0 0 0.75rem;
        font-size: 1rem;
        font-weight: 600;
    }

    .section-desc {
        margin: 0 0 1rem;
        font-size: 0.85rem;
        color: #64748b;
    }

    .search-input {
        width: 100%;
        padding: 0.5rem 0.75rem;
        border: 1px solid #e2e8f0;
        border-radius: 0.5rem;
        font-size: 0.9rem;
        margin-bottom: 0.75rem;
        box-sizing: border-box;
    }

    .table-wrap { overflow-x: auto; }

    .accounts-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.85rem;
    }

    .accounts-table th,
    .accounts-table td {
        text-align: left;
        padding: 0.4rem 0.6rem;
        border-bottom: 1px solid #f1f5f9;
    }

    .accounts-table th {
        font-weight: 600;
        color: #64748b;
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.04em;
    }

    .num { text-align: right; }
    .negative { color: #dc2626; }
    .mono  { font-family: monospace; }
    .small { font-size: 0.75rem; color: #94a3b8; }

    .hint {
        margin: 0.5rem 0 0;
        font-size: 0.82rem;
        color: #94a3b8;
    }

    .field-label {
        display: flex;
        flex-direction: column;
        gap: 0.3rem;
        font-size: 0.85rem;
        font-weight: 500;
        color: #374151;
        margin-bottom: 0.75rem;
    }

    .field-input {
        padding: 0.5rem 0.75rem;
        border: 1px solid #e2e8f0;
        border-radius: 0.5rem;
        font-size: 0.9rem;
        width: 100%;
        box-sizing: border-box;
    }

    .field-input.mono { font-family: monospace; }

    .reverse-btn {
        background: #dc2626;
        color: #fff;
        border: none;
        border-radius: 0.5rem;
        padding: 0.6rem 1.25rem;
        font-size: 0.9rem;
        font-weight: 600;
        cursor: pointer;
    }

    .reverse-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .success {
        color: #16a34a;
        font-size: 0.85rem;
        margin: 0 0 0.75rem;
    }
</style>
