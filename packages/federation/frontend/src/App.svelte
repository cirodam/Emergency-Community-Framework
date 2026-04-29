<script lang="ts">
    import { onMount } from "svelte";
    import { session } from "./lib/session.js";
    import {
        getConfig, verifyToken, listMembers, getEconomics, listApplications, reviewApplication, setupFederation,
        getAssembly, startAssemblyTerm,
        listFederationMotions,
        listInsuranceClaims, submitInsuranceClaim, reviewInsuranceClaim,
        type MemberDto, type EconomicsDto, type ApplicationDto, type FederationConfig,
        type AssemblyTerm, type FederationMotionDto, type InsuranceClaimDto,
    } from "./lib/api.js";

    // ── Setup (first-time, no community configured) ────────────────────────
    let setupUrl     = $state("");
    let setupLoading = $state(false);
    let setupError   = $state("");
    let setupSuccess = $state("");

    async function runSetup() {
        setupError   = "";
        setupSuccess = "";
        if (!config?.communityUrlPreset && !setupUrl.trim()) { setupError = "Enter the community URL"; return; }
        setupLoading = true;
        try {
            const urlArg = config?.communityUrlPreset ? undefined : setupUrl.trim();
            const member = await setupFederation(urlArg);
            setupSuccess = `Connected "${member.name}" as the founding community.`;
        } catch (e) {
            setupError = e instanceof Error ? e.message : "Setup failed";
        } finally {
            setupLoading = false;
        }
    }

    // ── Auth & session ─────────────────────────────────────────────────────
    let config       = $state<FederationConfig | null>(null);
    let sessionData  = $state($session);
    session.subscribe(v => { sessionData = v; });

    let loginError   = $state("");
    let loginLoading = $state(false);

    // Process community redirect (#session=<payload>) on first load
    onMount(async () => {
        config = await getConfig().catch(() => null);

        const hash = window.location.hash;
        if (hash.startsWith("#session=")) {
            loginLoading = true;
            try {
                const payload = JSON.parse(decodeURIComponent(atob(hash.slice(9)))) as {
                    token: string; id: string; firstName: string; lastName: string; handle: string;
                };
                const verified = await verifyToken(payload.token);
                session.login({ token: payload.token, ...verified });
                // Clean up the fragment so refreshing doesn't re-process it
                history.replaceState(null, "", window.location.pathname + window.location.search);
            } catch (e) {
                loginError = e instanceof Error ? e.message : "Authentication failed";
            } finally {
                loginLoading = false;
            }
        }
    });

    function signInWithCommunity() {
        if (!config) return;
        const returnUrl = window.location.origin + window.location.pathname;
        window.location.href = `${config.communityUrl}/login?return=${encodeURIComponent(returnUrl)}`;
    }

    // ── Navigation ─────────────────────────────────────────────────────────
    type Page = "overview" | "applications" | "assembly" | "domains";
    let currentPage = $state<Page>("overview");

    // ── Overview data ──────────────────────────────────────────────────────
    let members   = $state<MemberDto[]>([]);
    let economics = $state<EconomicsDto | null>(null);
    let overviewError = $state("");

    async function loadOverview() {
        overviewError = "";
        try {
            [members, economics] = await Promise.all([listMembers(), getEconomics()]);
        } catch (e) {
            overviewError = e instanceof Error ? e.message : "Load failed";
        }
    }

    // ── Applications data ──────────────────────────────────────────────────
    let applications    = $state<ApplicationDto[]>([]);
    let appsError       = $state("");
    let reviewingId     = $state<string | null>(null);
    let reviewError     = $state("");

    async function loadApplications() {
        appsError = "";
        try {
            applications = await listApplications();
        } catch (e) {
            appsError = e instanceof Error ? e.message : "Load failed";
        }
    }

    // ── Assembly data ──────────────────────────────────────────────────────
    let assemblyTerm   = $state<AssemblyTerm | null>(null);
    let assemblyMotions = $state<FederationMotionDto[]>([]);
    let assemblyError  = $state("");
    let startingTerm   = $state(false);

    async function loadAssembly() {
        assemblyError = "";
        try {
            const [a, m] = await Promise.all([getAssembly(), listFederationMotions()]);
            assemblyTerm    = a.term;
            assemblyMotions = m;
        } catch (e) {
            assemblyError = e instanceof Error ? e.message : "Load failed";
        }
    }

    async function doStartTerm() {
        startingTerm = true;
        try {
            assemblyTerm = await startAssemblyTerm();
        } catch (e) {
            assemblyError = e instanceof Error ? e.message : "Failed to start term";
        } finally {
            startingTerm = false;
        }
    }

    // ── Domains / Health Insurance data ───────────────────────────────────
    let poolBalance    = $state<number>(0);
    let insuranceClaims = $state<InsuranceClaimDto[]>([]);
    let domainsError   = $state("");
    let claimLoading   = $state(false);
    let reviewingClaimId = $state<string | null>(null);

    // Claim submission form
    let claimForm = $state({
        patientName: "",
        reason: "",
        requestedKin: "",
    });

    async function loadDomains() {
        domainsError = "";
        try {
            const result = await listInsuranceClaims();
            insuranceClaims = result.claims;
            poolBalance     = result.poolBalance;
        } catch (e) {
            domainsError = e instanceof Error ? e.message : "Load failed";
        }
    }

    async function doSubmitClaim() {
        if (!sessionData) return;
        const kin = Number(claimForm.requestedKin);
        if (!claimForm.patientName.trim() || !claimForm.reason.trim() || !kin || kin <= 0) {
            domainsError = "Fill in all claim fields with a positive kin amount";
            return;
        }
        domainsError = "";
        claimLoading = true;
        try {
            const claim = await submitInsuranceClaim({
                communityMemberId: sessionData.communityMemberId ?? "",
                communityHandle:   sessionData.communityHandle,
                patientName:       claimForm.patientName.trim(),
                reason:            claimForm.reason.trim(),
                requestedKin:      kin,
            });
            insuranceClaims = [claim, ...insuranceClaims];
            claimForm = { patientName: "", reason: "", requestedKin: "" };
        } catch (e) {
            domainsError = e instanceof Error ? e.message : "Submit failed";
        } finally {
            claimLoading = false;
        }
    }

    async function doReviewClaim(id: string, status: "approved" | "rejected") {
        domainsError = "";
        reviewingClaimId = id;
        try {
            const updated = await reviewInsuranceClaim(id, status);
            insuranceClaims = insuranceClaims.map(c => c.id === id ? updated : c);
        } catch (e) {
            domainsError = e instanceof Error ? e.message : "Review failed";
        } finally {
            reviewingClaimId = null;
        }
    }

    async function approve(id: string) {
        reviewError = "";
        reviewingId = id;
        try {
            const updated = await reviewApplication(id, "approved");
            applications = applications.map(a => a.id === id ? updated : a);
        } catch (e) {
            reviewError = e instanceof Error ? e.message : "Review failed";
        } finally {
            reviewingId = null;
        }
    }

    async function reject(id: string) {
        reviewError = "";
        reviewingId = id;
        try {
            const updated = await reviewApplication(id, "rejected");
            applications = applications.map(a => a.id === id ? updated : a);
        } catch (e) {
            reviewError = e instanceof Error ? e.message : "Review failed";
        } finally {
            reviewingId = null;
        }
    }

    $effect(() => {
        // Re-run when session or page changes
        const page = currentPage;
        if (sessionData) {
            if (page === "overview")     loadOverview();
            if (page === "applications") loadApplications();
            if (page === "assembly")     loadAssembly();
            if (page === "domains")      loadDomains();
        }
    });

    // ── Formatting ─────────────────────────────────────────────────────────
    function fmt(n: number, decimals = 0): string {
        return n.toLocaleString(undefined, { maximumFractionDigits: decimals });
    }
    function fmtDate(iso: string): string {
        return new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" });
    }

    const pendingCount = $derived(applications.filter(a => a.status === "pending").length);
</script>

<!-- ── Setup screen (no founding community yet) ──────────────────────────────── -->
{#if config && !config.isConfigured}
<div class="login-shell">
    <div class="login-card">
        <div class="login-icon">⬡</div>
        <h1>Set Up Federation</h1>
        <p class="login-sub">Connect a founding community to activate this federation node.</p>

        {#if setupError}
            <div class="error-banner">{setupError}</div>
        {/if}
        {#if setupSuccess}
            <div class="success-banner">{setupSuccess}</div>
            <p class="hint">You can now sign in with that community's credentials.</p>
            <button class="btn-primary login-btn" onclick={() => { config = { ...config!, isConfigured: true }; }}>
                Continue to Sign In
            </button>
        {:else}
            {#if !config?.communityUrlPreset}
                <label class="setup-field">
                    <span>Community URL</span>
                    <input
                        type="url"
                        bind:value={setupUrl}
                        placeholder="http://community.example.org"
                        disabled={setupLoading}
                    />
                </label>
            {:else}
                <p class="hint" style="text-align:left;color:#374151">
                    Community: <span class="mono" style="font-size:0.8rem">{config.communityUrl}</span>
                </p>
            {/if}
            <button class="btn-primary login-btn" onclick={runSetup} disabled={setupLoading || (!config?.communityUrlPreset && !setupUrl.trim())}>
                {setupLoading ? "Connecting…" : "Connect Founding Community"}
            </button>
        {/if}
    </div>
</div>

<!-- ── Login screen ─────────────────────────────────────────────────────────── -->
{:else if !sessionData}
<div class="login-shell">
    <div class="login-card">
        <div class="login-icon">⬡</div>
        <h1>Federation Portal</h1>
        <p class="login-sub">Sign in with your community credential to access the federation.</p>

        {#if loginError}
            <div class="error-banner">{loginError}</div>
        {/if}

        {#if loginLoading}
            <div class="loading">Verifying credential…</div>
        {:else}
            <button class="btn-primary login-btn" onclick={signInWithCommunity} disabled={!config}>
                Sign in with Community
            </button>
            {#if !config}
                <p class="hint">Connecting to federation…</p>
            {/if}
        {/if}
    </div>
</div>

<!-- ── App shell ─────────────────────────────────────────────────────────────── -->
{:else}
<div class="shell">
    <aside class="sidebar">
        <div class="sidebar-brand">
            <span class="brand-icon">⬡</span>
            <span class="brand-name">Federation</span>
        </div>

        <nav class="sidebar-nav">
            <button class="nav-item" class:active={currentPage === "overview"} onclick={() => { currentPage = "overview"; loadOverview(); }}>
                <span>⊞</span> Overview
            </button>
            <button class="nav-item" class:active={currentPage === "applications"} onclick={() => { currentPage = "applications"; loadApplications(); }}>
                <span>✦</span> Applications
                {#if pendingCount > 0}
                    <span class="badge">{pendingCount}</span>
                {/if}
            </button>
            <button class="nav-item" class:active={currentPage === "assembly"} onclick={() => { currentPage = "assembly"; loadAssembly(); }}>
                <span>◈</span> Assembly
            </button>
            <button class="nav-item" class:active={currentPage === "domains"} onclick={() => { currentPage = "domains"; loadDomains(); }}>
                <span>✚</span> Domains
            </button>
        </nav>

        <div class="sidebar-footer">
            <div class="session-info">
                <span class="session-handle">@{sessionData.handle}</span>
                <span class="session-community">{sessionData.communityName}</span>
            </div>
            <button class="btn-ghost sign-out" onclick={() => session.logout()}>Sign out</button>
        </div>
    </aside>

    <main class="main">

        <!-- ── Overview ── -->
        {#if currentPage === "overview"}
            <div class="page-header">
                <h1>Overview</h1>
                <button class="btn-ghost" onclick={loadOverview}>↻ Refresh</button>
            </div>

            {#if overviewError}
                <div class="error-banner">{overviewError}</div>
            {/if}

            <div class="stat-row">
                <div class="stat-card">
                    <span class="label">Kithe in circulation</span>
                    <span class="value">{economics ? fmt(economics.kitheInCirculation, 2) : "—"}</span>
                </div>
                <div class="stat-card">
                    <span class="label">Member communities</span>
                    <span class="value">{economics?.memberCount ?? members.length}</span>
                </div>
            </div>

            <section class="section">
                <h2>Members</h2>
                {#if members.length === 0}
                    <p class="empty">No communities have joined yet.</p>
                {:else}
                    <table>
                        <thead>
                            <tr>
                                <th>Community</th>
                                <th>Handle</th>
                                <th>Joined</th>
                                <th class="right">Kithe balance</th>
                            </tr>
                        </thead>
                        <tbody>
                            {#each members as m (m.id)}
                                {@const bal = economics?.members.find(e => e.handle === m.handle || e.name === m.name)?.balance}
                                <tr>
                                    <td>
                                        <span class="name">{m.name}</span>
                                        {#if m.isFounder}<span class="founder-badge">founder</span>{/if}
                                    </td>
                                    <td class="mono">@{m.handle}</td>
                                    <td>{fmtDate(m.joinedAt)}</td>
                                    <td class="right mono">{bal !== undefined ? fmt(bal, 2) : "—"}</td>
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                {/if}
            </section>

        <!-- ── Applications ── -->
        {:else if currentPage === "applications"}
            <div class="page-header">
                <h1>Applications</h1>
                <button class="btn-ghost" onclick={loadApplications}>↻ Refresh</button>
            </div>

            {#if appsError}
                <div class="error-banner">{appsError}</div>
            {/if}
            {#if reviewError}
                <div class="error-banner">{reviewError}</div>
            {/if}

            {#if applications.length === 0}
                <p class="empty">No applications yet.</p>
            {:else}
                {#each applications as app (app.id)}
                    <div class="app-card" class:pending={app.status === "pending"}>
                        <div class="app-header">
                            <div>
                                <span class="app-name">{app.communityName}</span>
                                <span class="app-handle mono">@{app.communityHandle}</span>
                            </div>
                            <span class="status-badge" class:approved={app.status === "approved"} class:rejected={app.status === "rejected"} class:pending={app.status === "pending"}>
                                {app.status}
                            </span>
                        </div>
                        <div class="app-meta">
                            <span>Members: {app.memberCount}</span>
                            <span>Submitted: {fmtDate(app.submittedAt)}</span>
                            {#if app.reviewedAt}<span>Reviewed: {fmtDate(app.reviewedAt)}</span>{/if}
                            <span class="url mono">{app.communityUrl}</span>
                        </div>
                        {#if app.status === "pending"}
                            <div class="app-actions">
                                <button
                                    class="btn-primary"
                                    onclick={() => approve(app.id)}
                                    disabled={reviewingId === app.id}
                                >Approve</button>
                                <button
                                    class="btn-danger"
                                    onclick={() => reject(app.id)}
                                    disabled={reviewingId === app.id}
                                >Reject</button>
                            </div>
                        {/if}
                    </div>
                {/each}
            {/if}
        {/if}

        <!-- ── Assembly ── -->
        {:else if currentPage === "assembly"}
            <div class="page-header">
                <h1>Assembly</h1>
                <div style="display:flex;gap:0.5rem">
                    <button class="btn-ghost" onclick={loadAssembly}>↻ Refresh</button>
                    <button class="btn-primary" onclick={doStartTerm} disabled={startingTerm}>
                        {startingTerm ? "Starting…" : "Start New Term"}
                    </button>
                </div>
            </div>

            {#if assemblyError}
                <div class="error-banner">{assemblyError}</div>
            {/if}

            {#if !assemblyTerm}
                <p class="empty">No assembly term has been started yet. Start one above to initialise the assembly.</p>
            {:else}
                <div class="stat-row">
                    <div class="stat-card">
                        <span class="label">Term</span>
                        <span class="value">#{assemblyTerm.termNumber}</span>
                    </div>
                    <div class="stat-card">
                        <span class="label">Delegates seated</span>
                        <span class="value">{assemblyTerm.seats.filter(s => s.personHandle).length} / {assemblyTerm.seats.length}</span>
                    </div>
                    <div class="stat-card">
                        <span class="label">Motions</span>
                        <span class="value">{assemblyMotions.length}</span>
                    </div>
                </div>

                <section class="section">
                    <h2>Delegates</h2>
                    {#if assemblyTerm.seats.length === 0}
                        <p class="empty">No seats yet — add member communities first.</p>
                    {:else}
                        <table>
                            <thead>
                                <tr>
                                    <th>Community</th>
                                    <th>Delegate</th>
                                    <th>Seated</th>
                                </tr>
                            </thead>
                            <tbody>
                                {#each assemblyTerm.seats as seat (seat.communityMemberId)}
                                    <tr>
                                        <td class="mono">@{seat.communityHandle}</td>
                                        <td>
                                            {#if seat.personHandle}
                                                <span class="name">{seat.personName}</span>
                                                <span class="mono" style="color:#64748b;margin-left:0.35rem;font-size:0.8em">@{seat.personHandle}</span>
                                            {:else}
                                                <span style="color:#94a3b8;font-style:italic">Vacant</span>
                                            {/if}
                                        </td>
                                        <td>{seat.seatedAt ? fmtDate(seat.seatedAt) : "—"}</td>
                                    </tr>
                                {/each}
                            </tbody>
                        </table>
                    {/if}
                </section>

                {#if assemblyMotions.length > 0}
                    <section class="section" style="margin-top:1.5rem">
                        <h2>Motions</h2>
                        {#each assemblyMotions as m (m.id)}
                            <div class="app-card">
                                <div class="app-header">
                                    <div>
                                        <span class="app-name">{m.title}</span>
                                        <span class="app-handle mono">@{m.proposerHandle}</span>
                                    </div>
                                    <span class="status-badge" class:approved={m.outcome === "passed"} class:rejected={m.outcome === "failed"} class:pending={m.stage === "voting" || m.stage === "deliberation"}>
                                        {m.stage}
                                    </span>
                                </div>
                                <p style="margin:0;font-size:0.85rem;color:#374151">{m.description}</p>
                                <div class="app-meta">
                                    <span>✓ {m.approvalCount} approve</span>
                                    <span>✗ {m.rejectionCount} reject</span>
                                    {#if m.resolvedAt}<span>Resolved: {fmtDate(m.resolvedAt)}</span>{/if}
                                </div>
                            </div>
                        {/each}
                    </section>
                {/if}
            {/if}

        <!-- ── Domains ── -->
        {:else if currentPage === "domains"}
            <div class="page-header">
                <h1>Domains</h1>
                <button class="btn-ghost" onclick={loadDomains}>↻ Refresh</button>
            </div>

            {#if domainsError}
                <div class="error-banner">{domainsError}</div>
            {/if}

            <!-- Health Insurance domain -->
            <div class="domain-card">
                <div class="domain-header">
                    <div class="domain-icon">✚</div>
                    <div>
                        <div class="domain-title">Health Insurance</div>
                        <div class="domain-desc">Cross-community health insurance pool. Submit claims for major illness, surgery, or catastrophic care.</div>
                    </div>
                    <div class="stat-card" style="min-width:auto;flex-shrink:0">
                        <span class="label">Pool balance</span>
                        <span class="value" style="font-size:1.2rem">{fmt(poolBalance, 2)} kin</span>
                    </div>
                </div>

                <!-- Submit claim form -->
                <div class="section" style="margin-top:1.25rem">
                    <h2>Submit a Claim</h2>
                    <div class="claim-form">
                        <label class="form-field">
                            <span>Patient name</span>
                            <input type="text" bind:value={claimForm.patientName} placeholder="Full name" disabled={claimLoading} />
                        </label>
                        <label class="form-field">
                            <span>Reason / diagnosis</span>
                            <input type="text" bind:value={claimForm.reason} placeholder="Brief description of medical need" disabled={claimLoading} />
                        </label>
                        <label class="form-field">
                            <span>Requested kin</span>
                            <input type="number" min="1" step="1" bind:value={claimForm.requestedKin} placeholder="0" disabled={claimLoading} />
                        </label>
                        <button class="btn-primary" onclick={doSubmitClaim} disabled={claimLoading || !claimForm.patientName.trim() || !claimForm.reason.trim() || !claimForm.requestedKin}>
                            {claimLoading ? "Submitting…" : "Submit Claim"}
                        </button>
                    </div>
                </div>

                <!-- Claims list -->
                <div class="section" style="margin-top:1.25rem">
                    <h2>Claims</h2>
                    {#if insuranceClaims.length === 0}
                        <p class="empty">No claims have been submitted yet.</p>
                    {:else}
                        {#each insuranceClaims as claim (claim.id)}
                            <div class="app-card">
                                <div class="app-header">
                                    <div>
                                        <span class="app-name">{claim.patientName}</span>
                                        <span class="app-handle mono">@{claim.communityHandle}</span>
                                    </div>
                                    <span class="status-badge"
                                        class:approved={claim.status === "approved" || claim.status === "auto-approved"}
                                        class:rejected={claim.status === "rejected"}
                                        class:pending={claim.status === "pending" || claim.status === "needs-review"}
                                    >{claim.status}</span>
                                </div>
                                <p style="margin:0;font-size:0.85rem;color:#374151">{claim.reason}</p>
                                <div class="app-meta">
                                    <span>Requested: {fmt(claim.requestedKin, 2)} kin</span>
                                    {#if claim.approvedKin !== null}<span>Approved: {fmt(claim.approvedKin, 2)} kin</span>{/if}
                                    <span>Submitted: {fmtDate(claim.submittedAt)}</span>
                                    {#if claim.reviewNote}<span style="font-style:italic">"{claim.reviewNote}"</span>{/if}
                                </div>
                                {#if claim.status === "needs-review" || claim.status === "pending"}
                                    <div class="app-actions">
                                        <button
                                            class="btn-primary"
                                            onclick={() => doReviewClaim(claim.id, "approved")}
                                            disabled={reviewingClaimId === claim.id}
                                        >Approve</button>
                                        <button
                                            class="btn-danger"
                                            onclick={() => doReviewClaim(claim.id, "rejected")}
                                            disabled={reviewingClaimId === claim.id}
                                        >Reject</button>
                                    </div>
                                {/if}
                            </div>
                        {/each}
                    {/if}
                </div>
            </div>
        {/if}

    </main>
</div>
{/if}

<style>
    :global(*, *::before, *::after) { box-sizing: border-box; }
    :global(body) {
        margin: 0;
        font-family: system-ui, sans-serif;
        background: #f8fafc;
        color: #0f172a;
    }

    /* ── Login ─────────────────────────────────────────────────────────────── */

    .login-shell {
        min-height: 100dvh;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #f0fdf4;
    }
    .login-card {
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 16px;
        padding: 2.5rem 2rem;
        width: 100%;
        max-width: 380px;
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.75rem;
    }
    .login-icon { font-size: 2.5rem; color: #15803d; }
    .login-card h1 { margin: 0; font-size: 1.5rem; font-weight: 700; }
    .login-sub { margin: 0; color: #64748b; font-size: 0.9rem; }
    .login-btn { width: 100%; margin-top: 0.5rem; }
    .hint { font-size: 0.8rem; color: #94a3b8; margin: 0; }
    .loading { color: #64748b; font-size: 0.9rem; }
    .setup-field {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
        width: 100%;
        text-align: left;
        font-size: 0.85rem;
        font-weight: 500;
        color: #374151;
    }
    .setup-field input {
        width: 100%;
        padding: 0.55rem 0.75rem;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        font-size: 0.875rem;
        font-family: inherit;
        outline: none;
    }
    .setup-field input:focus { border-color: #15803d; box-shadow: 0 0 0 2px #bbf7d0; }
    .success-banner {
        background: #f0fdf4;
        border: 1px solid #bbf7d0;
        color: #15803d;
        border-radius: 8px;
        padding: 0.75rem 1rem;
        font-size: 0.875rem;
        width: 100%;
        text-align: left;
    }

    /* ── Shell ─────────────────────────────────────────────────────────────── */

    .shell {
        display: flex;
        min-height: 100dvh;
    }

    /* ── Sidebar ───────────────────────────────────────────────────────────── */

    .sidebar {
        width: 14rem;
        min-height: 100dvh;
        height: 100dvh;
        position: sticky;
        top: 0;
        flex-shrink: 0;
        background: #fff;
        border-right: 1px solid #e2e8f0;
        display: flex;
        flex-direction: column;
        padding: 1rem 0.75rem;
        gap: 0.25rem;
    }
    .sidebar-brand {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.25rem 0.5rem 0.875rem;
        border-bottom: 1px solid #f1f5f9;
        margin-bottom: 0.5rem;
        font-weight: 700;
        font-size: 1rem;
        color: #0f172a;
    }
    .brand-icon { font-size: 1.25rem; color: #15803d; }
    .sidebar-nav { display: flex; flex-direction: column; gap: 0.125rem; flex: 1; }
    .nav-item {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        width: 100%;
        padding: 0.65rem 0.875rem;
        background: none;
        border: none;
        border-radius: 10px;
        font-size: 0.9rem;
        font-weight: 500;
        color: #374151;
        cursor: pointer;
        font-family: inherit;
        text-align: left;
    }
    .nav-item.active { background: #f0fdf4; color: #15803d; font-weight: 600; }
    .badge {
        margin-left: auto;
        background: #15803d;
        color: #fff;
        font-size: 0.7rem;
        font-weight: 700;
        border-radius: 99px;
        padding: 0.1rem 0.45rem;
        line-height: 1.4;
    }
    .sidebar-footer {
        margin-top: auto;
        padding-top: 0.75rem;
        border-top: 1px solid #e2e8f0;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }
    .session-info { display: flex; flex-direction: column; gap: 0.1rem; padding: 0 0.5rem; }
    .session-handle { font-weight: 600; font-size: 0.85rem; color: #0f172a; }
    .session-community { font-size: 0.75rem; color: #64748b; }

    /* ── Main ──────────────────────────────────────────────────────────────── */

    .main {
        flex: 1;
        min-width: 0;
        padding: 1.5rem 2rem 3rem;
        max-width: 860px;
    }
    .page-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 1.25rem;
    }
    .page-header h1 { margin: 0; font-size: 1.4rem; }

    /* ── Stats ─────────────────────────────────────────────────────────────── */

    .stat-row { display: flex; gap: 1rem; margin-bottom: 1.75rem; flex-wrap: wrap; }
    .stat-card {
        flex: 1;
        min-width: 180px;
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        padding: 1.1rem 1.25rem;
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
    }
    .label { font-size: 0.78rem; color: #64748b; font-weight: 500; text-transform: uppercase; letter-spacing: 0.04em; }
    .value { font-size: 1.5rem; font-weight: 700; color: #0f172a; }

    /* ── Tables ────────────────────────────────────────────────────────────── */

    .section h2 { font-size: 1rem; font-weight: 600; margin: 0 0 0.75rem; color: #374151; }
    table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
    th { text-align: left; font-size: 0.75rem; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.04em; padding: 0.5rem 0.75rem; border-bottom: 1px solid #e2e8f0; }
    td { padding: 0.75rem; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
    tr:last-child td { border-bottom: none; }
    .right { text-align: right; }
    .mono { font-family: ui-monospace, monospace; font-size: 0.85em; }
    .name { font-weight: 500; }
    .founder-badge {
        display: inline-block;
        margin-left: 0.4rem;
        font-size: 0.65rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        background: #f0fdf4;
        color: #15803d;
        border: 1px solid #bbf7d0;
        border-radius: 4px;
        padding: 0.1rem 0.35rem;
        vertical-align: middle;
    }

    /* ── Application cards ─────────────────────────────────────────────────── */

    .app-card {
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        padding: 1rem 1.25rem;
        margin-bottom: 0.75rem;
        display: flex;
        flex-direction: column;
        gap: 0.6rem;
    }
    .app-card.pending { border-color: #fef08a; background: #fefce8; }
    .app-header { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
    .app-name { font-weight: 600; font-size: 0.95rem; }
    .app-handle { margin-left: 0.5rem; color: #64748b; font-size: 0.85rem; }
    .app-meta { display: flex; gap: 1.25rem; font-size: 0.8rem; color: #64748b; flex-wrap: wrap; }
    .url { font-size: 0.75rem; }
    .app-actions { display: flex; gap: 0.5rem; }
    .status-badge {
        font-size: 0.72rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        border-radius: 6px;
        padding: 0.2rem 0.6rem;
        flex-shrink: 0;
    }
    .status-badge.pending  { background: #fef9c3; color: #854d0e; }
    .status-badge.approved { background: #f0fdf4; color: #15803d; }
    .status-badge.rejected { background: #fef2f2; color: #b91c1c; }

    /* ── Shared ────────────────────────────────────────────────────────────── */

    .error-banner {
        background: #fef2f2;
        border: 1px solid #fecaca;
        color: #b91c1c;
        border-radius: 8px;
        padding: 0.75rem 1rem;
        font-size: 0.875rem;
        margin-bottom: 1rem;
    }
    .empty { color: #94a3b8; font-size: 0.9rem; margin: 1rem 0; }
    .btn-primary {
        background: #15803d;
        color: #fff;
        border: none;
        border-radius: 8px;
        padding: 0.6rem 1.2rem;
        font-size: 0.875rem;
        font-weight: 600;
        cursor: pointer;
        font-family: inherit;
    }
    .btn-primary:hover:not(:disabled) { background: #166534; }
    .btn-primary:disabled { opacity: 0.55; cursor: not-allowed; }
    .btn-danger {
        background: #b91c1c;
        color: #fff;
        border: none;
        border-radius: 8px;
        padding: 0.6rem 1.2rem;
        font-size: 0.875rem;
        font-weight: 600;
        cursor: pointer;
        font-family: inherit;
    }
    .btn-danger:hover:not(:disabled) { background: #991b1b; }
    .btn-danger:disabled { opacity: 0.55; cursor: not-allowed; }
    .btn-ghost {
        background: none;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 0.45rem 0.875rem;
        font-size: 0.8rem;
        font-weight: 500;
        color: #374151;
        cursor: pointer;
        font-family: inherit;
    }
    .btn-ghost:hover { background: #f1f5f9; }
    .sign-out { width: 100%; }

    /* ── Domain cards ──────────────────────────────────────────────────────── */

    .domain-card {
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        padding: 1.25rem 1.5rem;
        margin-bottom: 1.25rem;
    }
    .domain-header {
        display: flex;
        align-items: flex-start;
        gap: 1rem;
        flex-wrap: wrap;
    }
    .domain-icon { font-size: 1.75rem; color: #15803d; flex-shrink: 0; }
    .domain-title { font-size: 1.1rem; font-weight: 700; color: #0f172a; }
    .domain-desc { font-size: 0.85rem; color: #64748b; margin-top: 0.2rem; max-width: 480px; }

    /* ── Claim form ────────────────────────────────────────────────────────── */

    .claim-form {
        display: flex;
        gap: 0.75rem;
        flex-wrap: wrap;
        align-items: flex-end;
    }
    .form-field {
        display: flex;
        flex-direction: column;
        gap: 0.3rem;
        font-size: 0.82rem;
        font-weight: 500;
        color: #374151;
        flex: 1;
        min-width: 160px;
    }
    .form-field input {
        padding: 0.5rem 0.75rem;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        font-size: 0.875rem;
        font-family: inherit;
        outline: none;
    }
    .form-field input:focus { border-color: #15803d; box-shadow: 0 0 0 2px #bbf7d0; }
</style>
