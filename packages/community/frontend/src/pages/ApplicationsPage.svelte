<script lang="ts">
    import {
        listApplications,
        vouchForApplication,
        removeApplicationVouch,
        withdrawApplication,
        type ApplicationDto,
    } from "../lib/api.js";
    import { session } from "../lib/session.js";

    // ── State ──────────────────────────────────────────────────────────────────
    let applications: ApplicationDto[] = $state([]);
    let loading     = $state(true);
    let pageError   = $state("");
    let expandedId: string | null = $state(null);
    let actionError = $state("");

    // ── Data loading ───────────────────────────────────────────────────────────
    async function load() {
        loading = true; pageError = "";
        try {
            applications = await listApplications();
        } catch (e) {
            pageError = e instanceof Error ? e.message : "Failed to load applications";
        } finally {
            loading = false;
        }
    }

    $effect(() => { load(); });

    // ── Derived ────────────────────────────────────────────────────────────────
    const myHandle = $derived($session?.handle ?? "");
    const pending  = $derived(applications.filter(a => a.status === "pending"));
    const resolved = $derived(applications.filter(a => a.status !== "pending"));

    // ── Actions ────────────────────────────────────────────────────────────────
    function toggleExpand(id: string) {
        expandedId = expandedId === id ? null : id;
        actionError = "";
    }

    async function doVouch(id: string) {
        actionError = "";
        try {
            const updated = await vouchForApplication(id);
            applications  = applications.map(a => a.id === id ? updated : a);
        } catch (e) {
            actionError = e instanceof Error ? e.message : "Failed to vouch";
        }
    }

    async function doUnvouch(id: string) {
        actionError = "";
        try {
            const updated = await removeApplicationVouch(id);
            applications  = applications.map(a => a.id === id ? updated : a);
        } catch (e) {
            actionError = e instanceof Error ? e.message : "Failed to remove vouch";
        }
    }

    async function doWithdraw(id: string) {
        actionError = "";
        try {
            const updated = await withdrawApplication(id);
            applications  = applications.map(a => a.id === id ? updated : a);
        } catch (e) {
            actionError = e instanceof Error ? e.message : "Failed to withdraw application";
        }
    }

    function hasVouched(app: ApplicationDto): boolean {
        return app.voucherHandles.includes(myHandle);
    }

    function isOwnApplication(app: ApplicationDto): boolean {
        return app.submittedByHandle === myHandle;
    }

    function formatDate(iso: string): string {
        return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
    }
</script>

<div class="applications-page">
    <div class="page-header">
        <h2 class="page-title">Applications</h2>
        <p class="page-subtitle">People applying for membership.</p>
    </div>

    {#if loading}
        <div class="loading-msg">Loading…</div>
    {:else if pageError}
        <div class="loading-msg error">{pageError}</div>
    {:else if applications.length === 0}
        <div class="empty-state">
            <div class="empty-icon">◎</div>
            <p>No applications yet.</p>
        </div>
    {:else}
        {#if pending.length > 0}
            <h3 class="section-title">Pending ({pending.length})</h3>
            {#each pending as app (app.id)}
                <div class="app-card" class:expanded={expandedId === app.id}>
                    <button class="app-header" onclick={() => toggleExpand(app.id)}>
                        <div class="app-avatar">{app.firstName[0]}{app.lastName[0]}</div>
                        <div class="app-summary">
                            <div class="app-name">{app.firstName} {app.lastName}</div>
                            <div class="app-meta">Applied {formatDate(app.submittedAt)}</div>
                        </div>
                        <div class="vouch-progress" title="{app.voucherHandles.length} of {app.vouchesRequired} vouches">
                            {#each { length: app.vouchesRequired } as _, i}
                                <span class="vouch-pip" class:filled={i < app.voucherHandles.length}></span>
                            {/each}
                            <span class="vouch-label">{app.voucherHandles.length}/{app.vouchesRequired}</span>
                        </div>
                        <span class="chevron">{expandedId === app.id ? "▲" : "▼"}</span>
                    </button>

                    {#if expandedId === app.id}
                        <div class="app-detail">
                            {#if actionError}
                                <p class="action-error">{actionError}</p>
                            {/if}

                            <blockquote class="app-message">"{app.message}"</blockquote>

                            <div class="detail-grid">
                                <span class="detail-label">Date of birth</span>
                                <span>{formatDate(app.birthDate + "T00:00:00")}</span>
                                <span class="detail-label">Submitted by</span>
                                <span>{app.submittedByName}</span>
                            </div>

                            {#if app.vouchers.length > 0}
                                <div class="vouchers-row">
                                    <span class="detail-label">Vouched by</span>
                                    <div class="voucher-chips">
                                        {#each app.vouchers as v}
                                            <span class="voucher-chip">{v.name}</span>
                                        {/each}
                                    </div>
                                </div>
                            {/if}

                            <div class="app-actions">
                                {#if hasVouched(app)}
                                    <button class="btn-ghost btn-sm" onclick={() => doUnvouch(app.id)}>
                                        Remove my vouch
                                    </button>
                                {:else}
                                    <button class="btn-vouch" onclick={() => doVouch(app.id)}>
                                        Vouch for {app.firstName}
                                    </button>
                                {/if}
                                {#if isOwnApplication(app)}
                                    <button class="btn-ghost btn-sm btn-withdraw" onclick={() => doWithdraw(app.id)}>
                                        Withdraw
                                    </button>
                                {/if}
                            </div>
                        </div>
                    {/if}
                </div>
            {/each}
        {:else}
            <div class="empty-state small">
                <p>No pending applications.</p>
            </div>
        {/if}

        {#if resolved.length > 0}
            <h3 class="section-title past">Past ({resolved.length})</h3>
            {#each resolved as app (app.id)}
                <div class="app-card resolved">
                    <button class="app-header" onclick={() => toggleExpand(app.id)}>
                        <div class="app-avatar" class:admitted={app.status === "admitted"} class:withdrawn={app.status === "withdrawn"}>
                            {app.firstName[0]}{app.lastName[0]}
                        </div>
                        <div class="app-summary">
                            <div class="app-name">{app.firstName} {app.lastName}</div>
                            <div class="app-meta">
                                {app.status === "admitted" ? "✓ Admitted" : "✕ Withdrawn"}
                                · {formatDate(app.submittedAt)}
                            </div>
                        </div>
                        <span class="chevron">{expandedId === app.id ? "▲" : "▼"}</span>
                    </button>

                    {#if expandedId === app.id}
                        <div class="app-detail">
                            <blockquote class="app-message">"{app.message}"</blockquote>
                            <div class="detail-grid">
                                <span class="detail-label">Submitted by</span>
                                <span>{app.submittedByName}</span>
                                {#if app.admittedAt}
                                    <span class="detail-label">Admitted</span>
                                    <span>{formatDate(app.admittedAt)}</span>
                                {/if}
                            </div>
                            {#if app.vouchers.length > 0}
                                <div class="vouchers-row">
                                    <span class="detail-label">Vouched by</span>
                                    <div class="voucher-chips">
                                        {#each app.vouchers as v}
                                            <span class="voucher-chip">{v.name}</span>
                                        {/each}
                                    </div>
                                </div>
                            {/if}
                        </div>
                    {/if}
                </div>
            {/each}
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
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 1.25rem;
    }

    .page-subtitle { margin-bottom: 1.5rem; }

    /* ── Buttons ─────────────────────────────────────────────────────────── */
    .action-error { color: #dc2626; font-size: 0.85rem; margin: 0 0 0.75rem; }

    .btn-ghost {
        padding: 0.5rem 1rem;
        background: transparent;
        color: #64748b;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        font-size: 0.9rem;
        font-weight: 500;
        cursor: pointer;
        transition: background 0.15s, color 0.15s;
    }
    .btn-ghost:hover { background: #f1f5f9; color: #0f172a; }

    .btn-sm { padding: 0.35rem 0.75rem; font-size: 0.8rem; }
    .btn-withdraw { color: #dc2626; border-color: #fecaca; }
    .btn-withdraw:hover { background: #fef2f2; }

    .btn-vouch {
        padding: 0.45rem 1rem;
        background: #16a34a;
        color: #fff;
        border: none;
        border-radius: 8px;
        font-size: 0.88rem;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.15s;
    }
    .btn-vouch:hover { background: #15803d; }

    /* ── Section headings ────────────────────────────────────────────────── */
    .section-title {
        margin: 1.25rem 0 0.6rem;
        font-size: 0.75rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.07em;
        color: #64748b;
    }
    .section-title.past { color: #94a3b8; }

    /* ── Application cards ───────────────────────────────────────────────── */
    .app-card {
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        margin-bottom: 0.6rem;
        overflow: hidden;
        transition: box-shadow 0.15s;
    }
    .app-card:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
    .app-card.expanded { border-color: #bbf7d0; box-shadow: 0 2px 12px rgba(22,163,74,0.1); }
    .app-card.resolved { opacity: 0.75; }

    .app-header {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        width: 100%;
        padding: 0.85rem 1rem;
        background: none;
        border: none;
        cursor: pointer;
        text-align: left;
    }

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
        text-transform: uppercase;
    }
    .app-avatar.admitted  { background: #dcfce7; color: #15803d; }
    .app-avatar.withdrawn { background: #f1f5f9; color: #94a3b8; }

    .app-summary { flex: 1; min-width: 0; }

    .app-name {
        font-size: 0.95rem;
        font-weight: 600;
        color: #0f172a;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .app-meta { font-size: 0.78rem; color: #94a3b8; margin-top: 0.1rem; }

    /* ── Vouch progress pips ─────────────────────────────────────────────── */
    .vouch-progress {
        display: flex;
        align-items: center;
        gap: 0.25rem;
        flex-shrink: 0;
    }

    .vouch-pip {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: #e2e8f0;
        transition: background 0.2s;
    }
    .vouch-pip.filled { background: #16a34a; }

    .vouch-label { font-size: 0.75rem; color: #64748b; margin-left: 0.2rem; }

    .chevron { font-size: 0.65rem; color: #94a3b8; flex-shrink: 0; }

    /* ── Expanded detail ─────────────────────────────────────────────────── */
    .app-detail {
        padding: 0 1rem 1rem;
        border-top: 1px solid #f1f5f9;
    }

    .app-message {
        margin: 0.75rem 0;
        padding: 0.75rem 1rem;
        background: #f8fafc;
        border-left: 3px solid #bbf7d0;
        border-radius: 0 8px 8px 0;
        font-style: italic;
        color: #334155;
        font-size: 0.9rem;
    }

    .detail-grid {
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 0.3rem 1rem;
        font-size: 0.85rem;
        margin-bottom: 0.75rem;
    }

    .detail-label { color: #94a3b8; font-weight: 500; white-space: nowrap; }

    .vouchers-row {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        flex-wrap: wrap;
        margin-bottom: 0.75rem;
        font-size: 0.85rem;
    }

    .voucher-chips { display: flex; gap: 0.35rem; flex-wrap: wrap; }

    .voucher-chip {
        padding: 0.2rem 0.6rem;
        background: #dcfce7;
        color: #15803d;
        border-radius: 99px;
        font-size: 0.78rem;
        font-weight: 500;
    }

    .app-actions {
        display: flex;
        gap: 0.5rem;
        margin-top: 0.75rem;
    }

    /* ── Empty / loading states ──────────────────────────────────────────── */
    .loading-msg {
        text-align: center;
        color: #64748b;
        padding: 3rem 1rem;
        font-size: 0.95rem;
    }
    .loading-msg.error { color: #dc2626; }

    .empty-state {
        text-align: center;
        padding: 3rem 1rem;
        color: #64748b;
    }
    .empty-state.small { padding: 1.5rem 1rem; }

    .empty-icon { font-size: 2.5rem; margin-bottom: 0.75rem; }

    .empty-state p { margin: 0.25rem 0; }
</style>
