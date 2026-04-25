<script lang="ts">
    interface Props {
        amount: number;
        currency?: string;
        size?: "sm" | "md" | "lg";
    }
    let { amount, currency = "kin", size = "md" }: Props = $props();

    const formatted = $derived(
        amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })
    );
</script>

<span class="amount {size}">
    <span class="value">{formatted}</span>
    <span class="currency">{currency}</span>
</span>

<style>
    .amount { display: inline-flex; align-items: baseline; gap: 0.25em; }

    .value  { font-variant-numeric: tabular-nums; font-weight: 600; }

    .currency {
        font-size: 0.7em;
        font-weight: 400;
        opacity: 0.6;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    .sm .value { font-size: 1rem; }
    .md .value { font-size: 1.5rem; }
    .lg .value { font-size: 2.5rem; }
</style>
