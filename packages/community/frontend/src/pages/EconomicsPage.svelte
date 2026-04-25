<script lang="ts">
    import { getEconomics } from "../lib/api.js";
    import type { EconomicsDto } from "../lib/api.js";

    let data: EconomicsDto | null = $state(null);
    let loading = $state(true);
    let error = $state("");
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

    function shortId(id: string): string {
        return id.slice(0, 8) + "…" + id.slice(-4);
    }
</script>

<div class="economics-page">
    <div class="page-header">
        <h2 class="page-title">Economics</h2>
        <button class="refresh-btn" onclick={load} disabled={loading} aria-label="Refresh">↻</button>
    </div>

    {#if lastUpdated}
        <p class="last-updated">Updated {lastUpdated.toLocaleTimeString()}</p>
    {/if}

    {#if loading && !data}
        <div class="skeleton"></div>
        <div class="skeleton short"></div>
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

        <!-- Central Bank -->
        <section class="institution-card">
            <div class="card-header">
                <div class="card-icon cb-icon">⊕</div>
                <div>
                    <h3>Central Bank</h3>
                    <p>Issues and retires kin — the community's internal currency.</p>
                </div>
            </div>

            {#if data.centralBank}
                <div class="metric-row primary">
                    <span>Kin in circulation</span>
                    <strong class="metric-value">{fmt(data.centralBank.kinInCirculation)} <span class="currency">kin</span></strong>
                </div>
                <div class="metric-row secondary">
                    <span>Issuance account</span>
                    <code>{shortId(data.centralBank.issuanceAccountId)}</code>
                </div>
                <div class="note">
                    Negative balance on the issuance account represents kin actively circulating
                    in the economy. When it returns to zero all kin has been retired.
                </div>
            {:else}
                <div class="unavailable">Unavailable — bank offline</div>
            {/if}
        </section>

        <!-- Currency Board -->
        <section class="institution-card">
            <div class="card-header">
                <div class="card-icon curboard-icon">⊜</div>
                <div>
                    <h3>Currency Board</h3>
                    <p>Issues kithe — the network settlement currency, 1:1 with kin.</p>
                </div>
            </div>

            {#if data.currencyBoard}
                <div class="metric-row primary">
                    <span>Kithe in circulation</span>
                    <strong class="metric-value">{fmt(data.currencyBoard.kitheInCirculation)} <span class="currency">kithe</span></strong>
                </div>
                <div class="metric-row secondary">
                    <span>Reserve ratio</span>
                    <strong>1:1 kin backing</strong>
                </div>
                <div class="metric-row secondary">
                    <span>Issuance account</span>
                    <code>{shortId(data.currencyBoard.issuanceAccountId)}</code>
                </div>
                <div class="note">
                    Kithe is minted only when kin reserves are deposited and burned
                    when they are withdrawn — the supply can never exceed the reserve.
                </div>
            {:else}
                <div class="unavailable">Unavailable — bank offline</div>
            {/if}
        </section>

        <!-- Social Insurance -->
        <section class="institution-card">
            <div class="card-header">
                <div class="card-icon si-icon">⊞</div>
                <div>
                    <h3>Social Insurance</h3>
                    <p>Community retirement pool — funded by member contributions, paid out monthly.</p>
                </div>
            </div>

            {#if data.socialInsurance}
                <div class="metric-row primary">
                    <span>Pool balance</span>
                    <strong class="metric-value">{fmt(data.socialInsurance.poolBalance)} <span class="currency">kin</span></strong>
                </div>
                <div class="metrics-grid">
                    <div class="mini-metric">
                        <span>Total contributed</span>
                        <strong>{fmt(data.socialInsurance.totalContributed)}</strong>
                    </div>
                    <div class="mini-metric">
                        <span>Total paid out</span>
                        <strong>{fmt(data.socialInsurance.totalPaidOut)}</strong>
                    </div>
                    <div class="mini-metric">
                        <span>Members in pool</span>
                        <strong>{data.socialInsurance.memberCount}</strong>
                    </div>
                    <div class="mini-metric">
                        <span>Net retained</span>
                        <strong>{fmt(data.socialInsurance.totalContributed - data.socialInsurance.totalPaidOut)}</strong>
                    </div>
                </div>
                <div class="metric-row secondary">
                    <span>Pool account</span>
                    <code>{shortId(data.socialInsurance.poolAccountId)}</code>
                </div>
                <div class="note">
                    The pool holds deferred liabilities and is excluded from demurrage.
                    On a member's departure, their unspent entitlement is burned,
                    keeping the kin supply honest.
                </div>
            {:else}
                <div class="unavailable">Unavailable — bank offline</div>
            {/if}
        </section>

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

    /* Skeletons */
    .skeleton {
        background: #e2e8f0;
        border-radius: 16px;
        height: 10rem;
        margin-bottom: 1rem;
        animation: pulse 1.4s ease-in-out infinite;
    }
    .skeleton.short { height: 6rem; }

    @keyframes pulse {
        0%, 100% { opacity: 1; }
        50%       { opacity: 0.5; }
    }

    .error-msg { text-align: center; color: #94a3b8; padding: 3rem 0; font-size: 0.95rem; }

    /* Degraded banner */
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

    /* Institution cards */
    .institution-card {
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 18px;
        overflow: hidden;
        margin-bottom: 1.25rem;
    }

    .card-header {
        display: flex;
        align-items: flex-start;
        gap: 1rem;
        padding: 1.25rem 1.25rem 1rem;
        border-bottom: 1px solid #f1f5f9;
    }

    .card-icon {
        width: 2.8rem;
        height: 2.8rem;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.3rem;
        flex-shrink: 0;
    }

    .cb-icon      { background: #dcfce7; color: #15803d; }
    .curboard-icon { background: #dbeafe; color: #1d4ed8; }
    .si-icon      { background: #ede9fe; color: #7c3aed; }

    .card-header h3 { font-size: 1rem; font-weight: 700; color: #0f172a; margin: 0 0 0.2rem; }
    .card-header p  { font-size: 0.8rem; color: #64748b; margin: 0; line-height: 1.4; }

    /* Metrics */
    .metric-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.75rem 1.25rem;
        gap: 1rem;
        border-bottom: 1px solid #f1f5f9;
        font-size: 0.9rem;
    }
    .metric-row:last-of-type { border-bottom: none; }
    .metric-row span  { color: #64748b; flex-shrink: 0; }
    .metric-row.secondary strong { font-weight: 600; color: #0f172a; }
    .metric-row code  { font-size: 0.75rem; color: #475569; }

    .metric-row.primary {
        padding: 1rem 1.25rem;
        background: #f8fafb;
    }
    .metric-value {
        font-size: 1.4rem;
        font-weight: 700;
        color: #15803d;
        font-variant-numeric: tabular-nums;
    }
    .currency { font-size: 0.8rem; font-weight: 500; color: #64748b; }

    /* 2×2 mini-metric grid */
    .metrics-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        border-bottom: 1px solid #f1f5f9;
    }
    .mini-metric {
        padding: 0.7rem 1.25rem;
        border-right: 1px solid #f1f5f9;
        border-bottom: 1px solid #f1f5f9;
        display: flex;
        flex-direction: column;
        gap: 0.2rem;
    }
    .mini-metric:nth-child(2n) { border-right: none; }
    .mini-metric:nth-last-child(-n+2) { border-bottom: none; }
    .mini-metric span   { font-size: 0.75rem; color: #64748b; }
    .mini-metric strong { font-size: 1rem; font-weight: 700; color: #0f172a; font-variant-numeric: tabular-nums; }

    /* Explanatory note at bottom of card */
    .note {
        font-size: 0.78rem;
        color: #94a3b8;
        padding: 0.85rem 1.25rem;
        line-height: 1.6;
        border-top: 1px solid #f1f5f9;
        background: #fafbfc;
    }

    .unavailable {
        padding: 1.25rem;
        font-size: 0.9rem;
        color: #94a3b8;
        font-style: italic;
    }

    @media (min-width: 768px) {
        .economics-page { padding-bottom: 2rem; max-width: 900px; }
    }
</style>
