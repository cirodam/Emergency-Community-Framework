<script lang="ts">
    import type { TransactionDto } from "../lib/api.js";

    interface Props {
        tx: TransactionDto;
        /** The account handle whose perspective to use for +/- sign */
        perspectiveAccountHandle: string;
    }
    let { tx, perspectiveAccountHandle }: Props = $props();

    const isCredit  = $derived(tx.to === perspectiveAccountHandle);
    const sign      = $derived(isCredit ? "+" : "−");
    const date      = $derived(new Date(tx.timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" }));
    const time      = $derived(new Date(tx.timestamp).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }));
    const formatted = $derived(
        tx.amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })
    );
</script>

<div class="tx-row">
    <div class="tx-meta">
        <span class="tx-memo">{tx.memo || "Transfer"}</span>
        <span class="tx-date">{date} · {time}</span>
    </div>
    <span class="tx-amount" class:credit={isCredit} class:debit={!isCredit}>
        {sign}{formatted} <small>{tx.currency}</small>
    </span>
</div>

<style>
    .tx-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.75rem 0;
        border-bottom: 1px solid #f1f5f9;
    }

    .tx-meta { display: flex; flex-direction: column; gap: 0.15rem; }

    .tx-memo { font-size: 0.95rem; font-weight: 500; }

    .tx-date { font-size: 0.75rem; color: #94a3b8; }

    .tx-amount {
        font-size: 1rem;
        font-weight: 600;
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
    }

    .tx-amount small {
        font-size: 0.65em;
        font-weight: 400;
        opacity: 0.6;
        text-transform: uppercase;
    }

    .credit { color: #16a34a; }
    .debit  { color: #0f172a; }
</style>
