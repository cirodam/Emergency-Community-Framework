<script lang="ts">
    import { listDomains, getCommunityBudget } from "../lib/api.js";
    import type { DomainDto, BudgetDomainRow } from "../lib/api.js";
    import { currentPage, selectedDomainId } from "../lib/session.js";

    let domains: DomainDto[] = $state([]);
    let budgetMap: Map<string, BudgetDomainRow> = $state(new Map());
    let loading = $state(true);
    let error = $state("");

    async function load() {
        loading = true;
        error = "";
        try {
            const [ds, budget] = await Promise.all([listDomains(), getCommunityBudget()]);
            domains = ds;
            budgetMap = new Map(budget.outflow.domains.map(r => [r.domainId, r]));
        } catch (e) {
            error = e instanceof Error ? e.message : "Failed to load domains";
        } finally {
            loading = false;
        }
    }

    $effect(() => { load(); });

    function openDomain(id: string) {
        selectedDomainId.set(id);
        currentPage.go("domain");
    }

    function fmt(n: number): string {
        return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
    }
</script>

<div class="domains-page">
    <h2 class="page-title">Domains</h2>
    <p class="page-subtitle">Domains provide services to the community.</p>

    {#if loading}
        <div class="card-grid">
            <div class="skeleton"></div>
            <div class="skeleton"></div>
            <div class="skeleton"></div>
            <div class="skeleton"></div>
        </div>
    {:else if error}
        <div class="error-msg">{error}</div>
    {:else if domains.length === 0}
        <div class="empty-msg">No domains registered.</div>
    {:else}
        <div class="card-grid">
            {#each domains as d (d.id)}
                {@const bud = budgetMap.get(d.id)}
                <button class="domain-card" onclick={() => openDomain(d.id)}>
                    <div class="card-top">
                        <span class="domain-name">{d.name}</span>
                        <span class="unit-pill">{d.unitIds.length} unit{d.unitIds.length !== 1 ? "s" : ""}</span>
                    </div>
                    {#if d.description}
                        <p class="domain-desc">{d.description}</p>
                    {/if}
                    {#if bud && bud.totals.total > 0}
                        <div class="outflow-line">
                            <span class="outflow-label">Outflow</span>
                            <span class="outflow-amount">{fmt(bud.totals.total)} kin/mo</span>
                        </div>
                    {/if}
                </button>
            {/each}
        </div>
        <p class="count">{domains.length} domain{domains.length !== 1 ? "s" : ""}</p>
    {/if}
</div>

<style>
    .domains-page {
        padding: 1.5rem 1rem 6rem;
        max-width: 960px;
        margin: 0 auto;
    }

    @media (min-width: 768px) {
        .domains-page { padding: 2rem 2rem 3rem; }
    }

    .page-title    { margin-bottom: 0.25rem; }
    .page-subtitle { margin-bottom: 1.5rem; }

    /* ── Card grid ────────────────────────────────────────────────────────── */

    .card-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 0.75rem;
    }

    @media (min-width: 540px) {
        .card-grid { grid-template-columns: 1fr 1fr; }
    }

    @media (min-width: 900px) {
        .card-grid { grid-template-columns: 1fr 1fr 1fr; }
    }

    .domain-card {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 0.875rem;
        padding: 1rem 1.1rem;
        cursor: pointer;
        text-align: left;
        font-family: inherit;
        color: inherit;
        transition: box-shadow 0.15s, border-color 0.15s, background 0.15s;
    }

    .domain-card:hover {
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px #eff6ff;
        background: #fafcff;
    }

    .card-top {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 0.5rem;
    }

    .domain-name {
        font-size: 0.975rem;
        font-weight: 700;
        color: #0f172a;
        line-height: 1.3;
    }

    .unit-pill {
        flex-shrink: 0;
        font-size: 0.68rem;
        font-weight: 600;
        color: #64748b;
        background: #f1f5f9;
        border-radius: 9999px;
        padding: 0.15rem 0.5rem;
        white-space: nowrap;
        margin-top: 0.1rem;
    }

    .domain-desc {
        font-size: 0.8rem;
        color: #64748b;
        margin: 0;
        line-height: 1.5;
        display: -webkit-box;
        -webkit-line-clamp: 3;
        line-clamp: 3;
        -webkit-box-orient: vertical;
        overflow: hidden;
    }

    /* ── Budget outflow line ──────────────────────────────────────────────── */

    .outflow-line {
        margin-top: auto;
        padding-top: 0.55rem;
        border-top: 1px solid #f1f5f9;
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        gap: 0.5rem;
    }

    .outflow-label {
        font-size: 0.72rem;
        font-weight: 600;
        color: #94a3b8;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    .outflow-amount {
        font-size: 0.8rem;
        font-weight: 700;
        color: #0f172a;
        white-space: nowrap;
    }

    /* ── Misc ─────────────────────────────────────────────────────────────── */

    .count {
        font-size: 0.8rem;
        color: #94a3b8;
        text-align: center;
        margin-top: 1.25rem;
    }

    .skeleton {
        height: 7rem;
        border-radius: 0.875rem;
        background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
        background-size: 200% 100%;
        animation: shimmer 1.2s infinite;
    }

    @keyframes shimmer {
        0%   { background-position: 200% 0; }
        100% { background-position: -200% 0; }
    }

    .error-msg, .empty-msg {
        font-size: 0.9rem;
        padding: 1rem 0;
        color: #ef4444;
    }
    .empty-msg { color: #94a3b8; }
</style>
