<script lang="ts">
    import TransactionRow from "../components/TransactionRow.svelte";
    import ErrorBanner from "../components/ErrorBanner.svelte";
    import { session } from "../lib/session.js";
    import { getTransactions } from "../lib/api.js";
    import type { TransactionDto } from "../lib/api.js";

    const s = $derived($session!);

    // Build a list of month options going back 12 months
    function monthOptions(): { value: string; label: string }[] {
        const opts = [{ value: "", label: "All" }];
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
    let selectedMonth = $state(months[1].value); // default to current month
    let txs: TransactionDto[] = $state([]);
    let error = $state("");
    let loading = $state(false);

    async function load() {
        loading = true;
        error = "";
        try {
            txs = await getTransactions(s.primaryAccountId, selectedMonth || undefined);
            // newest first
            txs = txs.slice().sort((a, b) => b.timestamp.localeCompare(a.timestamp));
        } catch (e) {
            error = e instanceof Error ? e.message : "Failed to load transactions";
        } finally {
            loading = false;
        }
    }

    $effect(() => { selectedMonth; load(); });
</script>

<div class="history-page">
    <h2 class="page-title">History</h2>

    <div class="filter-row">
        <select bind:value={selectedMonth} disabled={loading}>
            {#each months as m}
                <option value={m.value}>{m.label}</option>
            {/each}
        </select>
    </div>

    <ErrorBanner message={error} />

    {#if loading}
        <div class="loading-msg">Loading…</div>
    {:else if txs.length === 0}
        <div class="empty-msg">No transactions{selectedMonth ? " this month" : ""}.</div>
    {:else}
        <div class="tx-list">
            {#each txs as tx (tx.id)}
                <TransactionRow {tx} perspectiveAccountId={s.primaryAccountId} />
            {/each}
        </div>
    {/if}
</div>

<style>
    .history-page {
        padding: 1.5rem 1.5rem 6rem;
        max-width: 480px;
        margin: 0 auto;
    }

    .page-title { font-size: 1.4rem; font-weight: 700; color: #0f172a; margin: 0 0 1rem; }

    .filter-row { margin-bottom: 1.25rem; }

    select {
        border: 1px solid #cbd5e1;
        border-radius: 10px;
        font-size: 0.9rem;
        padding: 0.5rem 0.75rem;
        background: #fff;
        outline: none;
        cursor: pointer;
    }

    .loading-msg, .empty-msg {
        text-align: center;
        color: #94a3b8;
        padding: 3rem 0;
        font-size: 0.95rem;
    }

    .tx-list { display: flex; flex-direction: column; }
</style>
