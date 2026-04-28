<script lang="ts">
    import { getEconomics } from "../lib/api.js";
    import type { EconomicsDto } from "../lib/api.js";
    import { currentPage } from "../lib/session.js";

    let data: EconomicsDto | null = $state(null);
    let loading = $state(true);
    let error   = $state("");
    let lastUpdated = $state<Date | null>(null);

    async function load() {
        loading = true;
        error = "";
        try {
            data = await getEconomics();
            lastUpdated = new Date();
        } catch (e) {
            error = e instanceof Error ? e.message : "Failed to load";
        } finally {
            loading = false;
        }
    }

    $effect(() => { load(); });

    function fmt(n: number): string {
        return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
    }
</script>

<div class="economics-page">
    <div class="page-header">
        <h2 class="page-title">Economy</h2>
        <button class="refresh-btn" onclick={load} disabled={loading} aria-label="Refresh">↻</button>
    </div>

    {#if lastUpdated}
        <p class="last-updated">Updated {lastUpdated.toLocaleTimeString()}</p>
    {/if}

    {#if loading && !data}
        <div class="skeleton"></div>
        <div class="skeleton"></div>
        <div class="skeleton"></div>
    {:else if error}
        <div class="error-msg">{error}</div>
    {:else if data}

        {#if !data.ready}
            <div class="degraded-banner">
                <span class="degraded-icon">⚠</span>
                <div>
                    <strong>Bank offline</strong>
                    <p>Monetary data unavailable. The bank node is not reachable.</p>
                </div>
            </div>
        {/if}

        <button class="inst-card" onclick={() => currentPage.go("central-bank")}>
            <div class="inst-left">
                <div class="inst-icon cb-icon">⊕</div>
                <div class="inst-text">
                    <h3>Central Bank</h3>
                    <p>Issues and retires kin — the community's internal currency.</p>
                </div>
            </div>
            <div class="inst-right">
                {#if data.centralBank}
                    <div class="inst-metric">
                        <span class="metric-num">{fmt(data.centralBank.kinInCirculation)}</span>
                        <span class="metric-unit">kin</span>
                    </div>
                {:else}
                    <span class="metric-na">—</span>
                {/if}
                <span class="chevron">›</span>
            </div>
        </button>

        <button class="inst-card" onclick={() => currentPage.go("social-insurance")}>
            <div class="inst-left">
                <div class="inst-icon si-icon">⊞</div>
                <div class="inst-text">
                    <h3>Social Insurance</h3>
                    <p>Community retirement pool — funded by contributions, paid out monthly.</p>
                </div>
            </div>
            <div class="inst-right">
                {#if data.socialInsurance}
                    <div class="inst-metric">
                        <span class="metric-num">{fmt(data.socialInsurance.poolBalance)}</span>
                        <span class="metric-unit">kin</span>
                    </div>
                {:else}
                    <span class="metric-na">—</span>
                {/if}
                <span class="chevron">›</span>
            </div>
        </button>

        <button class="inst-card" onclick={() => currentPage.go("budget")}>
            <div class="inst-left">
                <div class="inst-icon bud-icon">⊟</div>
                <div class="inst-text">
                    <h3>Community Budget</h3>
                    <p>Monthly dues vs. outflow across all domains. Is the community solvent?</p>
                </div>
            </div>
            <div class="inst-right">
                <span class="chevron">›</span>
            </div>
        </button>

    {/if}
</div>

<style>
    .economics-page {
        padding: 1.5rem 1.5rem 6rem;
        max-width: 640px;
        margin: 0 auto;
    }

    .page-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.25rem;
    }

    .page-title { font-size: 1.4rem; font-weight: 700; color: #0f172a; margin: 0; }

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

    .last-updated { font-size: 0.78rem; color: #94a3b8; margin: 0 0 1.25rem; }

    .skeleton {
        background: #e2e8f0;
        border-radius: 16px;
        height: 5rem;
        margin-bottom: 0.85rem;
        animation: pulse 1.4s ease-in-out infinite;
    }

    @keyframes pulse {
        0%, 100% { opacity: 1; }
        50%       { opacity: 0.5; }
    }

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
    }
    .degraded-icon { font-size: 1.3rem; line-height: 1.4; }
    .degraded-banner strong { font-size: 0.95rem; color: #92400e; }
    .degraded-banner p { font-size: 0.85rem; color: #92400e; margin: 0.2rem 0 0; }

    /* Institution hub cards */
    .inst-card {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 18px;
        padding: 1.1rem 1.25rem;
        margin-bottom: 0.85rem;
        cursor: pointer;
        text-align: left;
        transition: box-shadow 0.15s, border-color 0.15s;
    }
    .inst-card:hover {
        box-shadow: 0 2px 12px rgba(0,0,0,0.07);
        border-color: #cbd5e1;
    }

    .inst-left {
        display: flex;
        align-items: center;
        gap: 1rem;
        min-width: 0;
    }

    .inst-icon {
        width: 2.8rem;
        height: 2.8rem;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.3rem;
        flex-shrink: 0;
    }
    .cb-icon  { background: #dcfce7; color: #15803d; }
    .cur-icon { background: #dbeafe; color: #1d4ed8; }
    .si-icon  { background: #ede9fe; color: #7c3aed; }
    .bud-icon { background: #fef9c3; color: #854d0e; }

    .inst-text h3 {
        font-size: 0.95rem;
        font-weight: 700;
        color: #0f172a;
        margin: 0 0 0.2rem;
    }
    .inst-text p {
        font-size: 0.78rem;
        color: #64748b;
        margin: 0;
        line-height: 1.4;
    }

    .inst-right {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        flex-shrink: 0;
    }

    .inst-metric {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
    }
    .metric-num  { font-size: 1.1rem; font-weight: 700; color: #0f172a; font-variant-numeric: tabular-nums; }
    .metric-unit { font-size: 0.7rem; color: #94a3b8; font-weight: 500; text-transform: uppercase; letter-spacing: 0.04em; }
    .metric-na   { font-size: 1rem; color: #cbd5e1; }

    .chevron { font-size: 1.4rem; color: #cbd5e1; line-height: 1; }

    @media (min-width: 768px) {
        .economics-page { padding-bottom: 2rem; }
    }
</style>
