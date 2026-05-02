<script lang="ts">
    import {
        getFederationMembership, syncFederationMembership, applyToFederation,
        type FederationMembershipRecord,
    } from "../lib/api.js";

    let membership  = $state<FederationMembershipRecord | null>(null);
    let loading     = $state(true);
    let syncing     = $state(false);
    let error       = $state("");

    // Apply form
    let showApply    = $state(false);
    let applyUrl     = $state("");
    let applyName    = $state("");
    let applyHandle  = $state("");
    let applyLoading = $state(false);
    let applyError   = $state("");

    async function load() {
        loading = true;
        error = "";
        try {
            membership = await getFederationMembership();
        } catch (e) {
            error = e instanceof Error ? e.message : "Failed to load connection info";
        } finally {
            loading = false;
        }
    }

    async function sync() {
        syncing = true;
        error = "";
        try {
            membership = await syncFederationMembership();
        } catch (e) {
            error = e instanceof Error ? e.message : "Sync failed";
        } finally {
            syncing = false;
        }
    }

    async function submitApply() {
        applyError = "";
        if (!applyUrl.trim())    { applyError = "Enter the federation URL"; return; }
        if (!applyName.trim())   { applyError = "Enter your community name"; return; }
        if (!applyHandle.trim()) { applyError = "Enter your community handle"; return; }
        applyLoading = true;
        try {
            membership = await applyToFederation(applyUrl.trim(), applyName.trim(), applyHandle.trim().toLowerCase());
            showApply = false;
        } catch (e) {
            applyError = e instanceof Error ? e.message : "Application failed";
        } finally {
            applyLoading = false;
        }
    }

    $effect(() => { load(); });

    function fmtDate(iso: string): string {
        return new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" });
    }

    const statusLabel: Record<string, string> = {
        pending:  "Pending review",
        approved: "Approved",
        rejected: "Rejected",
    };
</script>

<div class="page">
    <div class="page-header">
        <h1 class="page-title">Connections</h1>
        <button class="icon-btn" onclick={load} disabled={loading} title="Refresh">↻</button>
    </div>

    {#if error}
        <div class="error-banner">{error}</div>
    {/if}

    <!-- ── Federation ──────────────────────────────────────────────────────── -->
    <section class="section">
        <div class="section-header">
            <div class="section-title">Federation</div>
            {#if membership && membership.status === "pending"}
                <button class="text-btn" onclick={sync} disabled={syncing}>
                    {syncing ? "Syncing…" : "↻ Check status"}
                </button>
            {/if}
        </div>

        {#if loading}
            <div class="skeleton-card"></div>
        {:else if !membership}
            <!-- Not a member -->
            <div class="empty-card">
                <div class="empty-icon">⬡</div>
                <p>This community is not connected to a federation.</p>
                <button class="btn-primary" onclick={() => { showApply = !showApply; applyError = ""; }}>
                    {showApply ? "Cancel" : "Apply to join a federation"}
                </button>

                {#if showApply}
                    <div class="apply-form">
                        {#if applyError}
                            <div class="form-error">{applyError}</div>
                        {/if}
                        <label class="field">
                            <span>Federation URL</span>
                            <input type="url" bind:value={applyUrl} placeholder="http://federation.example.org" disabled={applyLoading} />
                        </label>
                        <label class="field">
                            <span>Community name</span>
                            <input type="text" bind:value={applyName} placeholder="e.g. Riverside Community" disabled={applyLoading} />
                        </label>
                        <label class="field">
                            <span>Community handle</span>
                            <div class="handle-wrap">
                                <input type="text" bind:value={applyHandle} placeholder="riverside" disabled={applyLoading} autocapitalize="none" />
                            </div>
                        </label>
                        <button class="btn-primary" onclick={submitApply} disabled={applyLoading}>
                            {applyLoading ? "Submitting…" : "Submit application"}
                        </button>
                    </div>
                {/if}
            </div>

        {:else}
            <!-- Has a record -->
            <div class="conn-card" class:approved={membership.status === "approved"} class:pending={membership.status === "pending"} class:rejected={membership.status === "rejected"}>
                <div class="conn-header">
                    <div class="conn-name">
                        <span class="conn-icon">⬡</span>
                        <a href={membership.federationUrl} target="_blank" rel="noopener noreferrer">{membership.federationUrl}</a>
                    </div>
                    <span class="status-badge status-{membership.status}">
                        {statusLabel[membership.status] ?? membership.status}
                    </span>
                </div>

                <div class="conn-rows">
                    {#if membership.communityHandle}
                        <div class="conn-row">
                            <span class="conn-label">Handle</span>
                            <span class="mono">@{membership.communityHandle}</span>
                        </div>
                    {/if}
                    {#if membership.federationHandle}
                        <div class="conn-row">
                            <span class="conn-label">Federation handle</span>
                            <span class="mono">@{membership.federationHandle}</span>
                        </div>
                    {/if}
                    {#if membership.commonwealthHandle}
                        <div class="conn-row">
                            <span class="conn-label">Commonwealth</span>
                            <span>
                                <span class="mono">@{membership.commonwealthHandle}</span>
                                {#if membership.commonwealthUrl}
                                    <a class="ext-link" href={membership.commonwealthUrl} target="_blank" rel="noopener noreferrer">↗</a>
                                {/if}
                            </span>
                        </div>
                    {/if}
                    {#if membership.globeHandle}
                        <div class="conn-row">
                            <span class="conn-label">Globe</span>
                            <span>
                                <span class="mono">@{membership.globeHandle}</span>
                                {#if membership.globeUrl}
                                    <a class="ext-link" href={membership.globeUrl} target="_blank" rel="noopener noreferrer">↗</a>
                                {/if}
                            </span>
                        </div>
                    {/if}
                    {#if membership.federationAccountId}
                        <div class="conn-row">
                            <span class="conn-label">Account ID</span>
                            <code class="mono small">{membership.federationAccountId}</code>
                        </div>
                    {/if}
                    <div class="conn-row">
                        <span class="conn-label">Applied</span>
                        <span>{fmtDate(membership.appliedAt)}</span>
                    </div>
                </div>

                {#if membership.status === "approved" && membership.federationUrl}
                    <a class="portal-link" href={membership.federationUrl} target="_blank" rel="noopener noreferrer">
                        Open federation portal ↗
                    </a>
                {/if}
            </div>
        {/if}
    </section>
</div>

<style>
    .page {
        padding: 1.5rem 1.5rem 6rem;
        max-width: 580px;
        margin: 0 auto;
    }

    @media (min-width: 768px) {
        .page { padding-bottom: 2rem; }
    }

    .page-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 1.5rem;
    }

    .page-title {
        font-size: 1.35rem;
        font-weight: 700;
        color: #0f172a;
        margin: 0;
    }

    .icon-btn {
        background: none;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 0.4rem 0.7rem;
        font-size: 1rem;
        color: #64748b;
        cursor: pointer;
        font-family: inherit;
    }
    .icon-btn:hover:not(:disabled) { background: #f0fdf4; color: #15803d; }
    .icon-btn:disabled { opacity: 0.5; cursor: not-allowed; }

    .error-banner {
        background: #fef2f2;
        border: 1px solid #fecaca;
        color: #b91c1c;
        border-radius: 8px;
        padding: 0.75rem 1rem;
        font-size: 0.875rem;
        margin-bottom: 1.25rem;
    }

    /* ── Section ──────────────────────────────────────────────────────────── */

    .section { margin-bottom: 2rem; }

    .section-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 0.75rem;
    }

    .section-title {
        font-size: 0.75rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: #94a3b8;
    }

    .text-btn {
        background: none;
        border: none;
        font-size: 0.8rem;
        color: #15803d;
        cursor: pointer;
        font-family: inherit;
        padding: 0;
    }
    .text-btn:hover:not(:disabled) { text-decoration: underline; }
    .text-btn:disabled { opacity: 0.5; cursor: not-allowed; }

    /* ── Skeleton ─────────────────────────────────────────────────────────── */

    .skeleton-card {
        height: 6rem;
        background: #f1f5f9;
        border-radius: 12px;
        animation: shimmer 1.4s ease-in-out infinite;
    }

    @keyframes shimmer {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
    }

    /* ── Empty / not connected ────────────────────────────────────────────── */

    .empty-card {
        background: #fff;
        border: 1px dashed #cbd5e1;
        border-radius: 12px;
        padding: 1.75rem 1.5rem;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.75rem;
        text-align: center;
    }

    .empty-icon { font-size: 2rem; color: #cbd5e1; }

    .empty-card p { margin: 0; color: #64748b; font-size: 0.9rem; }

    /* ── Apply form ───────────────────────────────────────────────────────── */

    .apply-form {
        width: 100%;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        margin-top: 0.5rem;
        text-align: left;
    }

    .form-error {
        background: #fef2f2;
        border: 1px solid #fecaca;
        color: #b91c1c;
        border-radius: 8px;
        padding: 0.6rem 0.875rem;
        font-size: 0.825rem;
    }

    .field {
        display: flex;
        flex-direction: column;
        gap: 0.3rem;
        font-size: 0.85rem;
        font-weight: 500;
        color: #374151;
    }

    .field input {
        padding: 0.5rem 0.75rem;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        font-size: 0.875rem;
        font-family: inherit;
        outline: none;
        background: #fff;
    }
    .field input:focus { border-color: #16a34a; box-shadow: 0 0 0 2px #bbf7d0; }

    .handle-wrap {
        display: flex;
        align-items: center;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        overflow: hidden;
        background: #fff;
    }
    .handle-wrap:focus-within { border-color: #16a34a; box-shadow: 0 0 0 2px #bbf7d0; }
    .handle-wrap input {
        border: none;
        padding: 0.5rem 0.75rem 0.5rem 0;
        outline: none;
        font-size: 0.875rem;
        font-family: inherit;
        flex: 1;
        box-shadow: none !important;
    }

    /* ── Connection card ──────────────────────────────────────────────────── */

    .conn-card {
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        padding: 1.25rem;
        display: flex;
        flex-direction: column;
        gap: 0.875rem;
    }
    .conn-card.approved { border-color: #bbf7d0; }
    .conn-card.rejected { border-color: #fecaca; background: #fef2f2; }

    .conn-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
    }

    .conn-name {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.875rem;
        font-weight: 500;
        min-width: 0;
    }
    .conn-name a {
        color: #0f172a;
        text-decoration: none;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    .conn-name a:hover { text-decoration: underline; }
    .conn-icon { font-size: 1.1rem; color: #15803d; flex-shrink: 0; }

    .status-badge {
        font-size: 0.7rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        border-radius: 6px;
        padding: 0.2rem 0.55rem;
        flex-shrink: 0;
    }
    .status-pending  { background: #fef9c3; color: #854d0e; }
    .status-approved { background: #f0fdf4; color: #15803d; }
    .status-rejected { background: #fef2f2; color: #b91c1c; }

    .conn-rows {
        display: flex;
        flex-direction: column;
        gap: 0.45rem;
        border-top: 1px solid #f1f5f9;
        padding-top: 0.75rem;
    }

    .conn-row {
        display: flex;
        align-items: baseline;
        gap: 0.5rem;
        font-size: 0.85rem;
    }
    .conn-label {
        min-width: 9rem;
        color: #64748b;
        flex-shrink: 0;
        font-size: 0.8rem;
    }

    .mono { font-family: ui-monospace, monospace; font-size: 0.82em; }
    .small { font-size: 0.75rem; }

    .ext-link {
        margin-left: 0.3rem;
        color: #15803d;
        text-decoration: none;
        font-size: 0.85rem;
    }

    .portal-link {
        display: inline-flex;
        align-items: center;
        padding: 0.5rem 0.875rem;
        background: #f0fdf4;
        border: 1px solid #bbf7d0;
        border-radius: 8px;
        color: #15803d;
        font-size: 0.875rem;
        font-weight: 600;
        text-decoration: none;
        width: fit-content;
    }
    .portal-link:hover { background: #dcfce7; }

    /* ── Shared buttons ───────────────────────────────────────────────────── */

    .btn-primary {
        background: #15803d;
        color: #fff;
        border: none;
        border-radius: 8px;
        padding: 0.6rem 1.1rem;
        font-size: 0.875rem;
        font-weight: 600;
        cursor: pointer;
        font-family: inherit;
        width: fit-content;
    }
    .btn-primary:hover:not(:disabled) { background: #166534; }
    .btn-primary:disabled { opacity: 0.55; cursor: not-allowed; }
</style>
