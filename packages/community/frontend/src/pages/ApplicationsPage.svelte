<script lang="ts">
    import { listMotions, type MotionDto } from "../lib/api.js";
    import { currentPage, selectedMotionId } from "../lib/session.js";

    let motions: MotionDto[] = $state([]);
    let loading   = $state(true);
    let pageError = $state("");

    async function load() {
        loading = true; pageError = "";
        try {
            motions = await listMotions({ kind: "add-person" });
        } catch (e) {
            pageError = e instanceof Error ? e.message : "Failed to load applications";
        } finally {
            loading = false;
        }
    }

    $effect(() => { load(); });

    const pending  = $derived(motions.filter(m => m.stage !== "resolved"));
    const resolved = $derived(motions.filter(m => m.stage === "resolved"));

    function nameFromTitle(title: string): string {
        return title.replace(/^membership application:\s*/i, "");
    }

    function initialsFromTitle(title: string): string {
        const parts = nameFromTitle(title).split(" ");
        return (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
    }

    function formatDate(iso: string): string {
        return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
    }

    function openMotion(m: MotionDto) {
        selectedMotionId.set(m.id);
        currentPage.go("motion");
    }
</script>

<div class="applications-page">
    <div class="page-header">
        <h2 class="page-title">Applications</h2>
        <p class="page-subtitle">Membership petitions open for community approval.</p>
    </div>

    {#if loading}
        <div class="loading-msg">Loading…</div>
    {:else if pageError}
        <div class="loading-msg error">{pageError}</div>
    {:else if motions.length === 0}
        <div class="empty-state">
            <div class="empty-icon">◎</div>
            <p>No membership applications yet.</p>
        </div>
    {:else}
        {#if pending.length > 0}
            <h3 class="section-title">Pending ({pending.length})</h3>
            {#each pending as m (m.id)}
                <button class="app-card" onclick={() => openMotion(m)}>
                    <div class="app-avatar">{initialsFromTitle(m.title).toUpperCase()}</div>
                    <div class="app-summary">
                        <div class="app-name">{nameFromTitle(m.title)}</div>
                        <div class="app-meta">Applied {formatDate(m.createdAt)}</div>
                    </div>
                    <div class="approval-progress" title="{m.approvalCount} of {m.minApprovals ?? '?'} approvals">
                        {#if m.minApprovals}
                            {#each { length: m.minApprovals } as _, i}
                                <span class="pip" class:filled={i < m.approvalCount}></span>
                            {/each}
                            <span class="pip-label">{m.approvalCount}/{m.minApprovals}</span>
                        {/if}
                    </div>
                    <span class="arrow">›</span>
                </button>
            {/each}
        {:else}
            <div class="empty-state small">
                <p>No pending applications.</p>
            </div>
        {/if}

        {#if resolved.length > 0}
            <details class="resolved-section">
                <summary class="section-title past">Past ({resolved.length})</summary>
                {#each resolved as m (m.id)}
                    <button class="app-card resolved" onclick={() => openMotion(m)}>
                        <div class="app-avatar" class:passed={m.outcome === "passed"} class:failed={m.outcome !== "passed"}>
                            {initialsFromTitle(m.title).toUpperCase()}
                        </div>
                        <div class="app-summary">
                            <div class="app-name">{nameFromTitle(m.title)}</div>
                            <div class="app-meta">
                                {m.outcome === "passed" ? "✓ Admitted" : "✕ Not admitted"}
                                · {formatDate(m.createdAt)}
                            </div>
                        </div>
                        <span class="arrow">›</span>
                    </button>
                {/each}
            </details>
        {/if}
    {/if}
</div>

<style>
    .applications-page {
        max-width: 680px;
        margin: 0 auto;
        padding: 1.5rem 1rem 6rem;
    }

    .page-header {
        margin-bottom: 1.25rem;
    }

    .page-title { font-size: 1.4rem; font-weight: 700; color: #0f172a; margin: 0 0 0.25rem; }
    .page-subtitle { font-size: 0.85rem; color: #64748b; margin: 0; }

    .section-title {
        margin: 1.25rem 0 0.5rem;
        font-size: 0.75rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.07em;
        color: #64748b;
    }
    .section-title.past { color: #94a3b8; }

    .app-card {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        width: 100%;
        padding: 0.85rem 1rem;
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        margin-bottom: 0.5rem;
        cursor: pointer;
        text-align: left;
        transition: box-shadow 0.15s, border-color 0.15s;
    }
    .app-card:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.06); border-color: #bbf7d0; }
    .app-card.resolved { opacity: 0.75; }

    .app-avatar {
        width: 2.5rem;
        height: 2.5rem;
        border-radius: 50%;
        background: #dcfce7;
        color: #15803d;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: 0.9rem;
        flex-shrink: 0;
    }
    .app-avatar.passed   { background: #dcfce7; color: #15803d; }
    .app-avatar.failed   { background: #f1f5f9; color: #94a3b8; }

    .app-summary { flex: 1; min-width: 0; }
    .app-name { font-size: 0.95rem; font-weight: 600; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .app-meta { font-size: 0.78rem; color: #94a3b8; margin-top: 0.1rem; }

    .approval-progress { display: flex; align-items: center; gap: 0.2rem; flex-shrink: 0; }
    .pip { width: 9px; height: 9px; border-radius: 50%; background: #e2e8f0; }
    .pip.filled { background: #16a34a; }
    .pip-label { font-size: 0.72rem; color: #64748b; margin-left: 0.2rem; }

    .arrow { font-size: 1rem; color: #94a3b8; flex-shrink: 0; }

    .resolved-section { margin-top: 1rem; }
    .resolved-section > summary { cursor: pointer; list-style: none; display: block; }

    .loading-msg { text-align: center; color: #64748b; padding: 3rem 1rem; font-size: 0.95rem; }
    .loading-msg.error { color: #dc2626; }

    .empty-state { text-align: center; padding: 3rem 1rem; color: #64748b; }
    .empty-state.small { padding: 1.5rem 1rem; }
    .empty-icon { font-size: 2.5rem; margin-bottom: 0.75rem; }
    .empty-state p { margin: 0.25rem 0; }
</style>
