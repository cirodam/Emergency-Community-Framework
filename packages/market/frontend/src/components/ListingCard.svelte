<script lang="ts">
    import type { Listing } from "../lib/api.js";
    import { session } from "../lib/session.js";

    interface Props {
        listing:    Listing;
        onCancel:   (id: string) => void;
        onPurchase: (id: string) => void;
    }

    let { listing, onCancel, onPurchase }: Props = $props();

    let confirming = $state(false);

    const isMine = $derived(listing.sellerId === ($session?.personId ?? ""));
    const isOpen = $derived(listing.status === "open");
    const canBuy = $derived(isOpen && !isMine);

    function handleAction() {
        if (isMine) {
            if (!confirming) { confirming = true; return; }
            onCancel(listing.id);
            confirming = false;
        } else {
            onPurchase(listing.id);
        }
    }

    function formatKin(n: number): string {
        return n.toLocaleString() + " kin";
    }

    const statusLabel: Record<string, string> = {
        open:      "Open",
        sold:      "Sold",
        cancelled: "Cancelled",
    };
</script>

<div class="card" class:sold={listing.status === "sold"} class:cancelled={listing.status === "cancelled"}>
    <div class="card-header">
        <span class="type-badge" class:service={listing.type === "service"}>{listing.type}</span>
        <span class="status-badge" class:open={isOpen}>{statusLabel[listing.status]}</span>
    </div>

    <h3 class="title">{listing.title}</h3>

    {#if listing.sellerHandle}
        <p class="seller">@{listing.sellerHandle}</p>
    {/if}

    {#if listing.description}
        <p class="description">{listing.description}</p>
    {/if}

    <div class="card-footer">
        <span class="price">{listing.price > 0 ? formatKin(listing.price) : "Free"}</span>

        {#if isOpen}
            {#if isMine}
                <button
                    class="action-btn cancel"
                    onclick={handleAction}
                >
                    {confirming ? "Confirm cancel?" : "Cancel listing"}
                </button>
                {#if confirming}
                    <button class="action-btn ghost" onclick={() => { confirming = false; }}>
                        Keep
                    </button>
                {/if}
            {:else if canBuy}
                <button class="action-btn buy" onclick={handleAction}>
                    Buy
                </button>
            {/if}
        {/if}
    </div>
</div>

<style>
    .card {
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 1rem;
        padding: 1rem 1.25rem;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        transition: box-shadow 0.15s;
    }

    .card:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.07); }

    .card.sold      { opacity: 0.65; }
    .card.cancelled { opacity: 0.5; }

    .card-header {
        display: flex;
        gap: 0.5rem;
        align-items: center;
    }

    .type-badge {
        font-size: 0.7rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        padding: 0.15rem 0.5rem;
        border-radius: 999px;
        background: #dbeafe;
        color: #1e40af;
    }

    .type-badge.service {
        background: #ede9fe;
        color: #5b21b6;
    }

    .status-badge {
        font-size: 0.7rem;
        font-weight: 500;
        padding: 0.15rem 0.5rem;
        border-radius: 999px;
        background: #f3f4f6;
        color: #6b7280;
        margin-left: auto;
    }

    .status-badge.open {
        background: #dcfce7;
        color: #15803d;
    }

    .title {
        font-size: 1rem;
        font-weight: 600;
        color: #111827;
        margin: 0;
        line-height: 1.3;
    }

    .seller {
        font-size: 0.8rem;
        color: #9ca3af;
        margin: 0;
    }

    .description {
        font-size: 0.875rem;
        color: #4b5563;
        margin: 0;
        line-height: 1.4;
        white-space: pre-wrap;
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
        overflow: hidden;
    }

    .card-footer {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-top: 0.25rem;
    }

    .price {
        font-size: 0.95rem;
        font-weight: 700;
        color: #14532d;
        flex: 1;
    }

    .action-btn {
        padding: 0.375rem 0.875rem;
        border-radius: 0.5rem;
        font-size: 0.8rem;
        font-weight: 600;
        border: none;
        cursor: pointer;
        transition: background 0.12s;
    }

    .action-btn.buy    { background: #16a34a; color: white; }
    .action-btn.buy:hover { background: #15803d; }

    .action-btn.cancel { background: #fee2e2; color: #991b1b; }
    .action-btn.cancel:hover { background: #fecaca; }

    .action-btn.ghost  { background: #f3f4f6; color: #374151; }
    .action-btn.ghost:hover  { background: #e5e7eb; }
</style>
