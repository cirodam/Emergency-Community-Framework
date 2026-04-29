<script lang="ts">
    import { getPool, listPersons, listMotions, markMotionDiscussed, recordMotionOutcome } from "../lib/api.js";
    import type { PoolDto, PersonDto, MotionDto, MotionOutcome } from "../lib/api.js";
    import { currentPage, selectedPoolId, session, selectedMotionId } from "../lib/session.js";

    let pool: PoolDto | null     = $state(null);
    let persons: PersonDto[]     = $state([]);
    let motions: MotionDto[]     = $state([]);
    let loading = $state(true);
    let error   = $state("");
    let docketError = $state("");

    let outcomingId   = $state<string | null>(null);
    let outcomeChoice = $state<MotionOutcome>("passed");
    let outcomeNote   = $state("");

    const isSteward = $derived(($session as any)?.isSteward ?? false);
    const poolId = $derived($selectedPoolId);

    async function load() {
        if (!poolId) { currentPage.go("leadership"); return; }
        loading = true;
        error = "";
        try {
            [pool, persons, motions] = await Promise.all([
                getPool(poolId),
                listPersons(),
                listMotions({ body: poolId }),
            ]);
        } catch (e) {
            error = e instanceof Error ? e.message : "Failed to load pool";
        } finally {
            loading = false;
        }
    }

    $effect(() => { load(); });

    const activeMotions   = $derived(motions.filter(m => m.stage !== "resolved"));
    const resolvedMotions = $derived(motions.filter(m => m.stage === "resolved"));

    function openMotion(m: MotionDto) {
        selectedMotionId.set(m.id);
        currentPage.go("motion");
    }

    async function doMarkDiscussed(id: string) {
        docketError = "";
        try {
            const updated = await markMotionDiscussed(id);
            motions = motions.map(m => m.id === id ? updated : m);
        } catch (e) { docketError = e instanceof Error ? e.message : "Failed"; }
    }

    async function doRecordOutcome(id: string) {
        docketError = "";
        try {
            const updated = await recordMotionOutcome(id, outcomeChoice, outcomeNote);
            motions = motions.map(m => m.id === id ? updated : m);
            outcomingId = null; outcomeNote = "";
        } catch (e) { docketError = e instanceof Error ? e.message : "Failed"; }
    }

    function personName(id: string): string {
        const p = persons.find(p => p.id === id);
        return p ? `${p.firstName} ${p.lastName}` : id;
    }

    function personHandle(id: string): string | null {
        return persons.find(p => p.id === id)?.handle ?? null;
    }
</script>

<div class="page">
    <div class="page-header">
        <button class="back-btn" onclick={() => currentPage.go("leadership")}>‹ Leadership</button>
        {#if pool}
            <h1 class="page-title">{pool.name}</h1>
            {#if pool.description}
                <p class="page-sub">{pool.description}</p>
            {/if}
        {:else if !loading}
            <h1 class="page-title">Pool</h1>
        {/if}
    </div>

    {#if loading}
        {#each [1, 2, 3] as _}
            <div class="skeleton"></div>
        {/each}
    {:else if error}
        <p class="error-msg">{error}</p>
    {:else if pool && pool.personIds.length === 0}
        <p class="empty-msg">No members in this pool yet.</p>
    {:else if pool}
        <div class="member-list">
            {#each pool.personIds as pid (pid)}
                <div class="member-card">
                    <span class="member-name">{personName(pid)}</span>
                    {#if personHandle(pid)}
                        <span class="member-handle">@{personHandle(pid)}</span>
                    {/if}
                </div>
            {/each}
        </div>
    {/if}

    <!-- Docket -->
    <hr class="divider" />
    <h2 class="section-heading">Docket</h2>

    {#if activeMotions.length === 0 && resolvedMotions.length === 0}
        <p class="empty-msg">No motions on the docket.</p>
    {:else}
        {#each activeMotions as m (m.id)}
            <div class="docket-card">
                <button class="docket-title" onclick={() => openMotion(m)}>{m.title}</button>
                <span class="docket-stage">{m.stage}</span>
                {#if isSteward && (m.stage === "proposed" || m.stage === "discussed")}
                    <div class="docket-actions">
                        {#if m.stage === "proposed"}
                            <button class="btn-sm" onclick={() => doMarkDiscussed(m.id)}>Mark discussed</button>
                        {/if}
                        <button class="btn-sm" onclick={() => { outcomingId = m.id; outcomeChoice = "passed"; outcomeNote = ""; }}>Record outcome</button>
                    </div>
                {/if}
                {#if outcomingId === m.id}
                    <div class="outcome-inline">
                        <select class="input-sm" bind:value={outcomeChoice}>
                            <option value="passed">Passed</option>
                            <option value="failed">Failed</option>
                            <option value="withdrawn">Withdrawn</option>
                            <option value="referred">Referred</option>
                        </select>
                        <input class="input-sm" type="text" placeholder="Notes" bind:value={outcomeNote} />
                        <button class="btn-sm btn-primary-sm" onclick={() => doRecordOutcome(m.id)}>Save</button>
                        <button class="btn-sm" onclick={() => outcomingId = null}>Cancel</button>
                    </div>
                {/if}
            </div>
        {/each}
        {#if resolvedMotions.length > 0}
            <details class="resolved-details">
                <summary>Resolved ({resolvedMotions.length})</summary>
                {#each resolvedMotions as m (m.id)}
                    <button class="docket-card docket-resolved" onclick={() => openMotion(m)}>
                        <span class="docket-title-text">{m.title}</span>
                        <span class="docket-outcome">{m.outcome}</span>
                    </button>
                {/each}
            </details>
        {/if}
    {/if}
    {#if docketError}<p class="error-msg">{docketError}</p>{/if}
</div>

<style>
    .page {
        padding: 1.5rem 1.5rem 6rem;
        max-width: 640px;
        margin: 0 auto;
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    @media (min-width: 768px) {
        .page { padding-bottom: 2rem; }
    }

    .page-header { display: flex; flex-direction: column; gap: 0.25rem; margin-bottom: 0.25rem; }

    .back-btn {
        background: none;
        border: none;
        color: #16a34a;
        font-size: 0.875rem;
        font-weight: 600;
        cursor: pointer;
        padding: 0;
        text-align: left;
        margin-bottom: 0.25rem;
    }

    .page-title {
        font-size: 1.3rem;
        font-weight: 700;
        color: #0f172a;
        margin: 0;
    }

    .page-sub {
        font-size: 0.82rem;
        color: #64748b;
        margin: 0;
    }

    .member-list {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .member-card {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.85rem 1.1rem;
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 0.75rem;
        gap: 1rem;
    }

    .member-name {
        font-size: 0.95rem;
        font-weight: 600;
        color: #0f172a;
    }

    .member-handle {
        font-size: 0.78rem;
        color: #64748b;
    }

    .skeleton {
        height: 3.5rem;
        background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
        background-size: 200% 100%;
        animation: shimmer 1.3s infinite;
        border-radius: 0.75rem;
    }

    @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

    .error-msg { font-size: 0.875rem; color: #dc2626; padding: 0.75rem 1rem; background: #fef2f2; border-radius: 0.5rem; margin: 0; }
    .empty-msg { font-size: 0.875rem; color: #64748b; margin: 0; }

    /* ── Docket ──────────────────────────────────────────────────────────────── */
    .divider { border: none; border-top: 1px solid #e2e8f0; margin: 0.25rem 0; }
    .section-heading { font-size: 0.95rem; font-weight: 700; color: #0f172a; margin: 0; }

    .docket-card {
        display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem;
        padding: 0.75rem 1rem; background: #fff; border: 1px solid #e2e8f0;
        border-radius: 0.75rem;
    }
    .docket-card.docket-resolved { cursor: pointer; background: #f8fafc; width: 100%; box-sizing: border-box; }
    .docket-title { background: none; border: none; cursor: pointer; font-size: 0.9rem; font-weight: 600; color: #0f172a; padding: 0; text-align: left; flex: 1; }
    .docket-title-text { font-size: 0.875rem; font-weight: 500; color: #334155; flex: 1; }
    .docket-stage  { font-size: 0.72rem; color: #64748b; background: #f1f5f9; padding: 0.15rem 0.5rem; border-radius: 9999px; }
    .docket-outcome { font-size: 0.72rem; color: #64748b; }
    .docket-actions { display: flex; gap: 0.4rem; flex-basis: 100%; }
    .outcome-inline { display: flex; gap: 0.4rem; flex-wrap: wrap; flex-basis: 100%; align-items: center; }

    .btn-sm { padding: 0.3rem 0.65rem; background: #f0fdf4; border: 1px solid #86efac; border-radius: 0.4rem; color: #15803d; font-size: 0.75rem; font-weight: 600; cursor: pointer; }
    .btn-primary-sm { background: #16a34a; color: #fff; border-color: #16a34a; }
    .input-sm { padding: 0.3rem 0.55rem; border: 1px solid #e2e8f0; border-radius: 0.4rem; font-size: 0.8rem; background: #fff; outline: none; font-family: inherit; }

    .resolved-details { font-size: 0.8rem; color: #64748b; }
    .resolved-details summary { cursor: pointer; padding: 0.3rem 0; font-weight: 600; }
</style>
