<script lang="ts">
    import { getCommunityBudget, updateConstitutionParameter, simulateBudgetStep } from "../lib/api.js";
    import type { CommunityBudgetDto, BudgetDomainRow } from "../lib/api.js";

    let data: CommunityBudgetDto | null = $state(null);
    let loading = $state(true);
    let error   = $state("");

    // Which domains are expanded
    let expanded: Set<string> = $state(new Set());

    // Dues rate editor
    let editingDues = $state(false);
    let duesInput   = $state("");
    let duesSaving  = $state(false);
    let duesError   = $state("");

    function startEditDues() {
        if (!data) return;
        duesInput  = (data.inflow.duesRate * 100).toFixed(2);
        duesError  = "";
        editingDues = true;
    }

    async function saveDues() {
        const pct = parseFloat(duesInput);
        if (isNaN(pct) || pct < 0 || pct > 10) {
            duesError = "Enter a value between 0 and 10%"; return;
        }
        duesSaving = true;
        duesError  = "";
        try {
            await updateConstitutionParameter("communityDuesRate", pct / 100);
            await load();
            editingDues = false;
        } catch (e) {
            duesError = e instanceof Error ? e.message : "Failed to save";
        } finally {
            duesSaving = false;
        }
    }

    const net = $derived(
        data ? data.inflow.estimatedMonthlyDues - data.outflow.monthlyTotal : 0
    );

    async function load() {
        loading = true;
        error = "";
        try {
            data = await getCommunityBudget();
        } catch (e) {
            error = e instanceof Error ? e.message : "Failed to load";
        } finally {
            loading = false;
        }
    }

    $effect(() => { load(); });

    // Simulate step (dev / testing)
    let simulating   = $state(false);
    let simResult    = $state("");
    let simError     = $state("");

    async function runSimulateStep() {
        simulating = true;
        simResult  = "";
        simError   = "";
        try {
            const r = await simulateBudgetStep();
            simResult = `Done — demurrage: ${r.demurrageCount} accts, dues: ${r.duesCount} accts, food: ${r.foodCount} members, payroll: ${r.payrollDomains} domains`;
            await load();
        } catch (e) {
            simError = e instanceof Error ? e.message : "Simulation failed";
        } finally {
            simulating = false;
        }
    }

    function toggle(domainId: string) {
        const next = new Set(expanded);
        if (next.has(domainId)) next.delete(domainId);
        else next.add(domainId);
        expanded = next;
    }

    function fmt(n: number): string {
        return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
    }

    function pct(part: number, whole: number): string {
        if (whole === 0) return "0%";
        return Math.round((part / whole) * 100) + "%";
    }

    /** How many kin months does the treasury cover at current burn rate? */
    function monthsCovered(treasury: number, monthly: number): string {
        if (monthly === 0) return "∞";
        const m = treasury / monthly;
        if (m >= 12) return (m / 12).toFixed(1) + " yr";
        return m.toFixed(1) + " mo";
    }

    const CATEGORY_LABEL: Record<string, string> = {
        supplies:  "Supplies",
        equipment: "Equipment",
        services:  "Services",
        other:     "Other",
    };
</script>

<div class="budget-page">
    <div class="page-header">
        <h2 class="page-title">Community Budget</h2>
        <div class="header-actions">
            <button class="refresh-btn" onclick={load} disabled={loading} aria-label="Refresh">↻</button>
            <button class="simulate-btn" onclick={runSimulateStep} disabled={simulating || loading} title="Run one demurrage + payroll cycle (dev)">
                {simulating ? "Running…" : "Simulate Step"}
            </button>
        </div>
    </div>
    {#if simResult}
        <div class="sim-result">{simResult}</div>
    {/if}
    {#if simError}
        <div class="sim-error">{simError}</div>
    {/if}

    {#if loading && !data}
        <div class="skeleton"></div>
        <div class="skeleton"></div>
        <div class="skeleton tall-skeleton"></div>
    {:else if error}
        <div class="error-msg">{error}</div>
    {:else if data}

        {#if !data.ready}
            <div class="degraded-banner">
                <span>⚠</span>
                <div>
                    <strong>Bank offline</strong>
                    <p>Inflow data unavailable — bank node unreachable.</p>
                </div>
            </div>
        {:else}

            <!-- Inflow -->
            <section class="budget-section">
                <h3 class="section-heading">Monthly Inflow</h3>

                <div class="kv-card">
                    <div class="kv-row">
                        <span class="kv-label">Treasury balance</span>
                        <span class="kv-value">{fmt(data.inflow.treasuryBalance)} <span class="unit">kin</span></span>
                    </div>
                    <div class="kv-row">
                        <span class="kv-label">Dues rate</span>
                        {#if editingDues}
                            <span class="dues-edit-row">
                                <input
                                    class="dues-input"
                                    type="number"
                                    min="0" max="10" step="0.1"
                                    bind:value={duesInput}
                                    onkeydown={(e) => { if (e.key === 'Enter') saveDues(); if (e.key === 'Escape') editingDues = false; }}
                                />
                                <span class="dues-pct-label">%</span>
                                <button class="dues-save-btn" onclick={saveDues} disabled={duesSaving}>Save</button>
                                <button class="dues-cancel-btn" onclick={() => editingDues = false} disabled={duesSaving}>✕</button>
                            </span>
                        {:else}
                            <span class="kv-value dues-value">
                                {(data.inflow.duesRate * 100).toFixed(1)}%
                                <button class="dues-edit-btn" onclick={startEditDues} title="Change dues rate">✎</button>
                            </span>
                        {/if}
                    </div>
                    {#if duesError}
                        <p class="dues-error">{duesError}</p>
                    {/if}
                    <div class="kv-row highlight-row">
                        <span class="kv-label">Estimated monthly dues</span>
                        <span class="kv-value strong">{fmt(data.inflow.estimatedMonthlyDues)} <span class="unit">kin</span></span>
                    </div>
                    {#if data.outflow.monthlyTotal > 0}
                        <div class="kv-row">
                            <span class="kv-label">Treasury runway</span>
                            <span class="kv-value">{monthsCovered(data.inflow.treasuryBalance, data.outflow.monthlyTotal)}</span>
                        </div>
                    {/if}
                </div>
            </section>

            <!-- Outflow -->
            <section class="budget-section">
                <h3 class="section-heading">
                    Monthly Outflow
                    <span class="section-total">{fmt(data.outflow.monthlyTotal)} kin</span>
                </h3>

                <!-- Net line -->
                <div class="net-row" class:surplus={net >= 0} class:deficit={net < 0}>
                    <span>{net >= 0 ? "Surplus" : "Shortfall"}</span>
                    <span>{net >= 0 ? "+" : ""}{fmt(net)} kin / mo</span>
                </div>

                <!-- Payroll vs items totals bar -->
                {#if data.outflow.monthlyTotal > 0}
                    <div class="split-bar-wrap">
                        <div class="split-bar">
                            <div
                                class="bar-segment bar-payroll"
                                style="width: {pct(data.outflow.totals.payroll, data.outflow.monthlyTotal)}"
                                title="Payroll {fmt(data.outflow.totals.payroll)} kin"
                            ></div>
                            <div
                                class="bar-segment bar-items"
                                style="width: {pct(data.outflow.totals.items, data.outflow.monthlyTotal)}"
                                title="Line items {fmt(data.outflow.totals.items)} kin"
                            ></div>
                        </div>
                        <div class="bar-legend">
                            <span class="legend-dot dot-payroll"></span>Payroll {fmt(data.outflow.totals.payroll)} kin
                            <span class="legend-dot dot-items"></span>Items {fmt(data.outflow.totals.items)} kin
                        </div>
                    </div>
                {/if}

                <!-- Per-domain rows -->
                {#if data.foodAllowancePerMember > 0}
                    <div class="domain-row community-row">
                        <span class="domain-name">Food allowance</span>
                        <span class="domain-meta">
                            <span class="domain-sub">{fmt(data.foodAllowancePerMember)} kin × {data.memberCount} members</span>
                            <span class="domain-total">{fmt(data.foodAllowancePerMember * data.memberCount)} kin</span>
                        </span>
                    </div>
                {/if}

                <!-- Per-domain rows -->
                {#each data.outflow.domains as domain (domain.domainId)}
                    {#if domain.totals.total > 0 || domain.payroll.length > 0 || domain.items.length > 0}
                        <div class="domain-row">
                            <button
                                class="domain-header"
                                onclick={() => toggle(domain.domainId)}
                                aria-expanded={expanded.has(domain.domainId)}
                            >
                                <span class="domain-name">{domain.domainName}</span>
                                <span class="domain-meta">
                                    <span class="domain-total">{fmt(domain.totals.total)} kin</span>
                                    <span class="expand-icon">{expanded.has(domain.domainId) ? "▲" : "▼"}</span>
                                </span>
                            </button>

                            {#if expanded.has(domain.domainId)}
                                <div class="domain-detail">

                                    {#if domain.totals.payroll > 0}
                                        <div class="detail-item">
                                            <span class="detail-label">Payroll</span>
                                            <span class="detail-amount">{fmt(domain.totals.payroll)} kin</span>
                                        </div>
                                    {/if}

                                    {#if domain.items.length > 0}
                                        <div class="detail-heading">
                                            Budget items
                                            <span class="detail-sub">{fmt(domain.totals.items)} kin</span>
                                        </div>
                                        {#each domain.items as item}
                                            <div class="detail-item">
                                                <span class="detail-label">
                                                    {item.label}
                                                    <span class="category-badge">{CATEGORY_LABEL[item.category] ?? item.category}</span>
                                                </span>
                                                <span class="detail-amount">{fmt(item.amount)} kin</span>
                                            </div>
                                        {/each}
                                    {/if}

                                    {#if domain.totals.payroll === 0 && domain.items.length === 0}
                                        <p class="empty-detail">No roles or budget items.</p>
                                    {/if}

                                </div>
                            {/if}
                        </div>
                    {/if}
                {/each}

                {#if data.outflow.domains.every(d => d.totals.total === 0 && d.payroll.length === 0 && d.items.length === 0)}
                    <p class="empty-msg">No roles or budget items have been added to any domain yet.</p>
                {/if}
            </section>
        {/if}
    {/if}
</div>

<style>
    .budget-page {
        padding: 1.5rem 1.5rem 6rem;
        max-width: 640px;
        margin: 0 auto;
    }

    .page-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.25rem;
    }
    .header-actions {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }
    .refresh-btn {
        background: none;
        border: none;
        font-size: 1.25rem;
        color: #64748b;
        cursor: pointer;
        padding: 0.25rem;
        transition: transform 0.3s;
    }
    .refresh-btn:disabled { opacity: 0.4; }
    .refresh-btn:not(:disabled):active { transform: rotate(180deg); }
    .simulate-btn {
        font-size: 0.78rem;
        padding: 0.3rem 0.75rem;
        background: #f1f5f9;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        color: #475569;
        cursor: pointer;
        transition: background 0.15s;
    }
    .simulate-btn:not(:disabled):hover { background: #e2e8f0; }
    .simulate-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .sim-result {
        font-size: 0.8rem;
        color: #15803d;
        background: #f0fdf4;
        border: 1px solid #bbf7d0;
        border-radius: 8px;
        padding: 0.5rem 0.75rem;
        margin-bottom: 0.75rem;
    }
    .sim-error {
        font-size: 0.8rem;
        color: #b91c1c;
        background: #fef2f2;
        border: 1px solid #fecaca;
        border-radius: 8px;
        padding: 0.5rem 0.75rem;
        margin-bottom: 0.75rem;
    }

    .skeleton {
        background: #e2e8f0;
        border-radius: 16px;
        height: 5rem;
        margin-bottom: 0.85rem;
        animation: pulse 1.4s ease-in-out infinite;
    }
    .tall-skeleton { height: 10rem; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }

    .error-msg { text-align: center; color: #94a3b8; padding: 3rem 0; font-size: 0.95rem; }

    .degraded-banner {
        display: flex;
        align-items: flex-start;
        gap: 0.85rem;
        background: #fef3c7;
        border: 1px solid #fde68a;
        border-radius: 12px;
        padding: 1rem 1.25rem;
        margin-bottom: 1.25rem;
        font-size: 1.2rem;
    }
    .degraded-banner strong { font-size: 0.95rem; color: #92400e; }
    .degraded-banner p { font-size: 0.85rem; color: #92400e; margin: 0.2rem 0 0; }

    /* Sections */
    .budget-section { margin-bottom: 1.75rem; }

    .section-heading {
        font-size: 0.8rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.07em;
        color: #64748b;
        margin: 0 0 0.75rem;
        display: flex;
        align-items: center;
        justify-content: space-between;
    }
    .section-total { font-size: 0.95rem; color: #0f172a; font-weight: 700; text-transform: none; letter-spacing: 0; }

    /* KV card */
    .kv-card {
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 16px;
        overflow: hidden;
    }
    .kv-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.75rem 1.1rem;
        border-bottom: 1px solid #f1f5f9;
    }
    .kv-row:last-child { border-bottom: none; }
    .highlight-row { background: #f8fafc; }

    .kv-label { font-size: 0.85rem; color: #475569; }
    .kv-value { font-size: 0.95rem; color: #0f172a; font-variant-numeric: tabular-nums; }
    .kv-value.strong { font-weight: 700; }
    .unit { font-size: 0.72rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.04em; }

    /* Dues rate editor */
    .dues-value { display: flex; align-items: center; gap: 0.4rem; }
    .dues-edit-btn {
        background: none; border: none; cursor: pointer;
        font-size: 0.8rem; color: #94a3b8; padding: 0 0.1rem;
        line-height: 1;
    }
    .dues-edit-btn:hover { color: #3b82f6; }
    .dues-edit-row { display: flex; align-items: center; gap: 0.35rem; }
    .dues-input {
        width: 4.5rem; padding: 0.2rem 0.4rem;
        border: 1px solid #3b82f6; border-radius: 6px;
        font-size: 0.9rem; font-family: inherit;
        text-align: right;
    }
    .dues-pct-label { font-size: 0.85rem; color: #64748b; }
    .dues-save-btn {
        padding: 0.2rem 0.6rem; border: none; border-radius: 6px;
        background: #3b82f6; color: #fff; font-size: 0.8rem;
        cursor: pointer; font-family: inherit;
    }
    .dues-save-btn:disabled { opacity: 0.6; cursor: default; }
    .dues-cancel-btn {
        background: none; border: none; cursor: pointer;
        font-size: 0.85rem; color: #94a3b8; padding: 0;
    }
    .dues-error { font-size: 0.78rem; color: #dc2626; margin: 0 1.1rem 0.5rem; }

    /* Net row */
    .net-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.6rem 1rem;
        border-radius: 10px;
        font-size: 0.88rem;
        font-weight: 600;
        margin-bottom: 0.85rem;
    }
    .net-row.surplus { background: #f0fdf4; color: #15803d; }
    .net-row.deficit { background: #fff7ed; color: #c2410c; }

    /* Split bar */
    .split-bar-wrap { margin-bottom: 1rem; }
    .split-bar {
        height: 8px;
        border-radius: 99px;
        background: #e2e8f0;
        overflow: hidden;
        display: flex;
        margin-bottom: 0.4rem;
    }
    .bar-segment { height: 100%; }
    .bar-payroll { background: #34d399; }
    .bar-items   { background: #fbbf24; }

    .bar-legend { font-size: 0.76rem; color: #64748b; display: flex; align-items: center; gap: 0.75rem; }
    .legend-dot {
        display: inline-block;
        width: 8px;
        height: 8px;
        border-radius: 50%;
    }
    .dot-payroll { background: #34d399; }
    .dot-items   { background: #fbbf24; }

    /* Domain rows */
    .domain-row {
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 14px;
        margin-bottom: 0.5rem;
        overflow: hidden;
    }

    .community-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.85rem 1.1rem;
        background: #fafdf7;
        border-color: #d1fae5;
    }

    .domain-header {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.85rem 1.1rem;
        background: none;
        border: none;
        cursor: pointer;
        text-align: left;
    }
    .domain-header:hover { background: #f8fafc; }

    .domain-name { font-size: 0.9rem; font-weight: 600; color: #0f172a; }
    .domain-meta { display: flex; align-items: center; gap: 0.6rem; }
    .domain-total { font-size: 0.88rem; color: #475569; font-variant-numeric: tabular-nums; }
    .expand-icon  { font-size: 0.65rem; color: #94a3b8; }

    /* Domain detail */
    .domain-detail {
        border-top: 1px solid #f1f5f9;
        padding: 0.75rem 1.1rem 1rem;
    }

    .detail-heading {
        font-size: 0.75rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: #94a3b8;
        margin: 0.5rem 0 0.4rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }
    .detail-heading:first-child { margin-top: 0; }
    .detail-sub { font-weight: 500; color: #64748b; text-transform: none; letter-spacing: 0; }

    .detail-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.3rem 0;
        border-bottom: 1px dashed #f1f5f9;
        gap: 0.5rem;
    }
    .detail-item:last-child { border-bottom: none; }

    .detail-label { font-size: 0.83rem; color: #334155; display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap; }
    .detail-amount { font-size: 0.83rem; color: #0f172a; font-variant-numeric: tabular-nums; white-space: nowrap; }

    .vacant-badge {
        font-size: 0.68rem;
        background: #f1f5f9;
        color: #94a3b8;
        border-radius: 4px;
        padding: 0.1rem 0.35rem;
        font-weight: 500;
    }

    .category-badge {
        font-size: 0.68rem;
        background: #fef9c3;
        color: #854d0e;
        border-radius: 4px;
        padding: 0.1rem 0.35rem;
        font-weight: 500;
    }

    .empty-detail { font-size: 0.8rem; color: #94a3b8; margin: 0.25rem 0 0; }
    .empty-msg    { text-align: center; color: #94a3b8; font-size: 0.9rem; padding: 2rem 0; }

    @media (min-width: 768px) {
        .budget-page { padding-bottom: 2rem; }
    }
</style>
