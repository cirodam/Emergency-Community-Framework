<script lang="ts">
    import { getEconomics } from "../lib/api.js";
    import type { EconomicsDto } from "../lib/api.js";
    import { currentPage } from "../lib/session.js";

    let econ    = $state<EconomicsDto | null>(null);
    let loading = $state(true);
    let error   = $state("");

    async function load() {
        loading = true;
        error   = "";
        try {
            econ = await getEconomics();
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

<div class="detail-page">
    <div class="top-bar">
        <button class="back-btn" onclick={() => currentPage.go("economy")}>← Economy</button>
        <button class="refresh-btn" onclick={load} disabled={loading} aria-label="Refresh">↻</button>
    </div>

    <div class="hero cur">
        <div class="hero-icon">⊜</div>
        <div>
            <h2>Currency Board</h2>
            <p>Issues kithe — the network settlement currency, 1:1 backed by kin reserves.</p>
        </div>
    </div>

    {#if loading && !econ}
        <div class="skeleton"></div>
        <div class="skeleton short"></div>
    {:else if error}
        <div class="error-msg">{error}</div>
    {:else if econ}

        {#if !econ.ready}
            <div class="degraded-banner">
                <span>⚠</span>
                <div>
                    <strong>Bank offline</strong>
                    <p>Live kithe data unavailable. The bank node is not reachable.</p>
                </div>
            </div>
        {/if}

        <!-- Primary stat -->
        <section class="stat-card">
            <div class="stat-label">Kithe in circulation</div>
            {#if econ.currencyBoard}
                <div class="stat-value cur-color">{fmt(econ.currencyBoard.kitheInCirculation)}<span class="stat-unit"> kithe</span></div>
                <p class="stat-note">
                    Every kithe in existence is backed by exactly one kin held in reserve.
                    The total can never exceed the kin reserve balance.
                </p>
            {:else if econ.ready}
                <div class="stat-offline">Currency Board not yet initialised</div>
            {:else}
                <div class="stat-offline">Unavailable — bank offline</div>
            {/if}
        </section>

        <!-- Reserve mechanics -->
        <section class="policy-card">
            <h3 class="section-title">Reserve policy</h3>

            <div class="policy-row">
                <div class="policy-label">
                    <span class="policy-name">Reserve ratio</span>
                    <span class="policy-auth">immutable</span>
                </div>
                <strong class="policy-value">1:1 kin backing</strong>
            </div>

            <div class="policy-row">
                <div class="policy-label">
                    <span class="policy-name">Can supply exceed reserves?</span>
                </div>
                <strong class="policy-value">Never</strong>
            </div>

            <div class="policy-row">
                <div class="policy-label">
                    <span class="policy-name">Redemption</span>
                    <span class="policy-auth">on demand</span>
                </div>
                <strong class="policy-value">1 kithe = 1 kin</strong>
            </div>
        </section>

        <!-- How it works -->
        <section class="explainer-card">
            <h3 class="section-title">How it works</h3>

            <div class="explainer-block">
                <div class="expl-icon">⊕</div>
                <div>
                    <strong>Minting kithe</strong>
                    <p>
                        To obtain kithe, a community or federation member deposits kin
                        into the currency board's reserve account. The board then mints
                        an equal amount of kithe and transfers it to the requester.
                        The reserve balance rises with every mint.
                    </p>
                </div>
            </div>

            <div class="explainer-block">
                <div class="expl-icon">↺</div>
                <div>
                    <strong>Burning kithe</strong>
                    <p>
                        To redeem kithe back to kin, the holder sends kithe to the board.
                        The board burns those kithe and releases the equivalent kin from
                        reserves. Supply and reserves shrink together — the ratio stays 1:1.
                    </p>
                </div>
            </div>

            <div class="explainer-block">
                <div class="expl-icon">⊞</div>
                <div>
                    <strong>Why kithe exists</strong>
                    <p>
                        Kin is the unit of account within a single community. Kithe
                        is the interoperability layer: communities in a federation can
                        settle inter-community trades using kithe without one community's
                        monetary policy affecting another's kin supply.
                    </p>
                </div>
            </div>

            <div class="explainer-block">
                <div class="expl-icon">⊚</div>
                <div>
                    <strong>Stability guarantee</strong>
                    <p>
                        Because every kithe is fully backed and redeemable at par, the
                        currency board cannot be "run on." Any holder who prefers kin can
                        redeem at any time, keeping the exchange rate anchored at 1:1.
                    </p>
                </div>
            </div>
        </section>

    {/if}
</div>

<style>
    .detail-page {
        padding: 1.25rem 1.5rem 6rem;
        max-width: 640px;
        margin: 0 auto;
    }

    .top-bar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
    }

    .back-btn {
        background: none;
        border: none;
        font-size: 0.9rem;
        font-weight: 600;
        color: #15803d;
        cursor: pointer;
        padding: 0.25rem 0;
    }
    .back-btn:hover { text-decoration: underline; }

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

    /* Hero */
    .hero {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 1.25rem;
        border-radius: 18px;
        margin-bottom: 1.25rem;
    }
    .hero.cur { background: #eff6ff; border: 1px solid #bfdbfe; }

    .hero-icon {
        font-size: 2rem;
        width: 3.2rem;
        height: 3.2rem;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #dbeafe;
        border-radius: 14px;
        flex-shrink: 0;
        color: #1d4ed8;
    }

    .hero h2 { font-size: 1.3rem; font-weight: 700; color: #0f172a; margin: 0 0 0.25rem; }
    .hero p  { font-size: 0.85rem; color: #64748b; margin: 0; line-height: 1.5; }

    .skeleton {
        background: #e2e8f0;
        border-radius: 16px;
        height: 9rem;
        margin-bottom: 1rem;
        animation: pulse 1.4s ease-in-out infinite;
    }
    .skeleton.short { height: 5rem; }

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
        margin-bottom: 1rem;
        font-size: 0.85rem;
        color: #92400e;
    }
    .degraded-banner strong { display: block; font-size: 0.95rem; }
    .degraded-banner p { margin: 0.2rem 0 0; }

    .stat-card {
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 18px;
        padding: 1.25rem;
        margin-bottom: 1rem;
    }

    .stat-label { font-size: 0.8rem; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 0.4rem; }
    .stat-value { font-size: 2.4rem; font-weight: 800; font-variant-numeric: tabular-nums; line-height: 1.1; margin-bottom: 0.75rem; }
    .cur-color  { color: #1d4ed8; }
    .stat-unit  { font-size: 1rem; font-weight: 600; color: #64748b; }
    .stat-note  { font-size: 0.82rem; color: #94a3b8; margin: 0; line-height: 1.6; }
    .stat-offline { font-size: 0.9rem; color: #94a3b8; font-style: italic; }

    .policy-card {
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 18px;
        overflow: hidden;
        margin-bottom: 1rem;
    }

    .section-title {
        font-size: 0.75rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.07em;
        color: #94a3b8;
        margin: 0;
        padding: 1rem 1.25rem 0.6rem;
        border-bottom: 1px solid #f1f5f9;
    }

    .policy-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.7rem 1.25rem;
        border-bottom: 1px solid #f1f5f9;
        gap: 1rem;
    }
    .policy-row:last-child { border-bottom: none; }

    .policy-label { display: flex; flex-direction: column; gap: 0.1rem; }
    .policy-name  { font-size: 0.875rem; font-weight: 500; color: #1e293b; }
    .policy-auth  { font-size: 0.7rem; color: #94a3b8; }
    .policy-value { font-size: 0.9rem; font-weight: 700; color: #0f172a; flex-shrink: 0; }

    .explainer-card {
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 18px;
        overflow: hidden;
        margin-bottom: 1rem;
    }

    .explainer-block {
        display: flex;
        gap: 1rem;
        padding: 1rem 1.25rem;
        border-bottom: 1px solid #f1f5f9;
    }
    .explainer-block:last-child { border-bottom: none; }

    .expl-icon {
        font-size: 1.1rem;
        width: 2rem;
        height: 2rem;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #f1f5f9;
        border-radius: 8px;
        flex-shrink: 0;
        color: #475569;
    }

    .explainer-block strong { font-size: 0.875rem; font-weight: 700; color: #0f172a; display: block; margin-bottom: 0.3rem; }
    .explainer-block p { font-size: 0.82rem; color: #64748b; margin: 0; line-height: 1.6; }

    @media (min-width: 768px) {
        .detail-page { padding-bottom: 2rem; }
    }
</style>
