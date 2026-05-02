<script lang="ts">
    import { listNominations, confirmNomination, declineNomination, listExpiringRoles, listRoles, listDomains, listUnits } from "../lib/api.js";
    import type { NominationDto, ExpiringRoleDto, RoleDto, DomainDto, UnitDto } from "../lib/api.js";
    import { currentPage, selectedUnitId, selectedDomainId } from "../lib/session.js";

    let nominations: NominationDto[]   = $state([]);
    let expiring: ExpiringRoleDto[]     = $state([]);
    let roles: RoleDto[]                = $state([]);
    let domains: DomainDto[]            = $state([]);
    let units: UnitDto[]                = $state([]);
    let loading = $state(true);
    let error   = $state("");
    let actionError = $state("");

    async function load() {
        loading = true;
        error = "";
        try {
            [nominations, expiring, roles, domains, units] = await Promise.all([
                listNominations(),
                listExpiringRoles(60),
                listRoles(),
                listDomains(),
                listUnits(),
            ]);
        } catch (e) {
            error = e instanceof Error ? e.message : "Failed to load";
        } finally {
            loading = false;
        }
    }

    $effect(() => { load(); });

    let pending  = $derived(nominations.filter(n => n.status === "pending"));
    let accepted  = $derived(nominations.filter(n => n.status === "accepted"));
    let resolved  = $derived(nominations.filter(n => n.status === "confirmed" || n.status === "declined"));

    function roleTitle(id: string): string {
        return roles.find(r => r.id === id)?.title ?? id;
    }

    function unitName(id: string): string {
        return units.find(u => u.id === id)?.name ?? id;
    }

    function domainName(id: string): string {
        return domains.find(d => d.id === id)?.name ?? id;
    }

    function daysUntil(iso: string): number {
        return Math.round((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    }

    function formatDate(iso: string): string {
        return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
    }

    async function doConfirm(id: string) {
        actionError = "";
        try {
            const result = await confirmNomination(id);
            nominations = nominations.map(n => n.id === id ? result.nomination : n);
        } catch (e) {
            actionError = e instanceof Error ? e.message : "Failed to confirm";
        }
    }

    async function doDecline(id: string) {
        actionError = "";
        try {
            const updated = await declineNomination(id);
            nominations = nominations.map(n => n.id === id ? updated : n);
        } catch (e) {
            actionError = e instanceof Error ? e.message : "Failed to decline";
        }
    }

    function openUnit(unitId: string, domainId: string) {
        selectedDomainId.set(domainId);
        selectedUnitId.set(unitId);
        currentPage.go("unit");
    }
</script>

<div class="page">
    <div class="page-header">
        <div>
            <h2 class="page-title">Nominations</h2>
            <p class="page-subtitle">Review pending nominations and monitor roles coming up for renewal.</p>
        </div>
    </div>

    {#if loading}
        <div class="skeleton wide"></div>
        <div class="skeleton short"></div>
        <div class="skeleton"></div>
    {:else if error}
        <div class="error-msg">{error}</div>
    {:else}
        {#if actionError}
            <div class="error-msg" style="margin-bottom:1rem;">{actionError}</div>
        {/if}

        <!-- Pending nominations -->
        <section class="section">
            <h3 class="section-title">Awaiting nominee response {#if pending.length > 0}<span class="badge">{pending.length}</span>{/if}</h3>

            {#if pending.length === 0}
                <p class="empty-msg">No pending nominations.</p>
            {:else}
                <div class="card-list">
                    {#each pending as n (n.id)}
                        <div class="card">
                            <div class="card-top">
                                <div class="card-info">
                                    <span class="card-name">@{n.nomineeHandle ?? "unknown"}</span>
                                    <span class="card-sub">nominated by @{n.createdByHandle ?? "unknown"}</span>
                                </div>
                                <div class="card-actions">
                                    <button class="confirm-btn" onclick={() => doConfirm(n.id)}>Accept</button>
                                    <button class="decline-btn" onclick={() => doDecline(n.id)}>Decline</button>
                                </div>
                            </div>
                            <div class="card-meta">
                                {#if n.type === "pool"}
                                    Leader Pool: {n.poolName ?? n.poolId}
                                {:else}
                                    {roleTitle(n.roleId)} · {unitName(n.unitId)} · {domainName(n.domainId)}
                                {/if}
                            </div>
                            {#if n.statement}
                                <p class="card-statement">"{n.statement}"</p>
                            {/if}
                            <p class="card-date">{formatDate(n.createdAt)}</p>
                        </div>
                    {/each}
                </div>
            {/if}
        </section>

        <!-- On assembly docket -->
        <section class="section">
            <h3 class="section-title">On assembly docket {#if accepted.length > 0}<span class="badge amber">{accepted.length}</span>{/if}</h3>

            {#if accepted.length === 0}
                <p class="empty-msg">No nominations awaiting assembly vote.</p>
            {:else}
                <div class="card-list">
                    {#each accepted as n (n.id)}
                        <div class="card docket-card">
                            <div class="card-top">
                                <div class="card-info">
                                    <span class="card-name">@{n.nomineeHandle ?? "unknown"}</span>
                                    <span class="card-sub">nominated by @{n.createdByHandle ?? "unknown"}</span>
                                </div>
                                <span class="status-badge accepted">Assembly vote</span>
                            </div>
                            <div class="card-meta">
                                {roleTitle(n.roleId)} · {unitName(n.unitId)} · {domainName(n.domainId)}
                            </div>
                            {#if n.statement}
                                <p class="card-statement">"{n.statement}"</p>
                            {/if}
                            <p class="card-date">Accepted {formatDate(n.createdAt)}</p>
                        </div>
                    {/each}
                </div>
            {/if}
        </section>

        <!-- Expiring roles -->
        <section class="section">
            <h3 class="section-title">Terms expiring within 60 days {#if expiring.length > 0}<span class="badge amber">{expiring.length}</span>{/if}</h3>

            {#if expiring.length === 0}
                <p class="empty-msg">No terms expiring soon.</p>
            {:else}
                <div class="card-list">
                    {#each expiring as r (r.roleId)}
                        <div class="card expiring-card">
                            <div class="card-top">
                                <div class="card-info">
                                    <span class="card-name">{r.roleTitle}</span>
                                    <span class="card-sub">@{r.memberHandle ?? "unknown"} · {r.unitName} · {r.domainName}</span>
                                </div>
                                <div class="expiry-info">
                                    <span class="expiry-days" class:urgent={daysUntil(r.termEndDate) <= 14}>
                                        {daysUntil(r.termEndDate)}d left
                                    </span>
                                    <button class="unit-btn" onclick={() => openUnit(r.unitId, r.domainId)}>View unit</button>
                                </div>
                            </div>
                            <p class="card-date">Term ends {formatDate(r.termEndDate)}</p>
                        </div>
                    {/each}
                </div>
            {/if}
        </section>

        <!-- Recently resolved -->
        {#if resolved.length > 0}
            <section class="section">
                <h3 class="section-title">Recently resolved</h3>
                <div class="card-list">
                    {#each resolved.slice(0, 10) as n (n.id)}
                        <div class="card resolved-card">
                            <div class="card-top">
                                <div class="card-info">
                                    <span class="card-name">@{n.nomineeHandle ?? "unknown"}</span>
                                    <span class="card-sub">nominated by @{n.createdByHandle ?? "unknown"}</span>
                                </div>
                                <span class="status-badge" class:confirmed={n.status === "confirmed"} class:declined={n.status === "declined"}>
                                    {n.status}
                                </span>
                            </div>
                            {#if n.resolvedAt}
                                <p class="card-date">{formatDate(n.resolvedAt)}</p>
                            {/if}
                        </div>
                    {/each}
                </div>
            </section>
        {/if}
    {/if}
</div>

<style>
.page {
    padding: 1rem 1rem 5rem;
    max-width: 600px;
    margin: 0 auto;
    background: #f0fdf4;
    min-height: 100vh;
}
.page-header {
    margin-bottom: 1.5rem;
}
.page-title {
    font-size: 1.4rem;
    font-weight: 700;
    color: #14532d;
    margin: 0 0 0.25rem;
}
.page-subtitle {
    font-size: 0.82rem;
    color: #6b7280;
    margin: 0;
}
.section {
    margin-bottom: 2rem;
}
.section-title {
    font-size: 0.88rem;
    font-weight: 700;
    color: #374151;
    margin: 0 0 0.75rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
}
.badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: #15803d;
    color: #fff;
    font-size: 0.72rem;
    font-weight: 700;
    min-width: 1.2rem;
    height: 1.2rem;
    padding: 0 0.35rem;
    border-radius: 999px;
}
.badge.amber { background: #d97706; }
.skeleton {
    height: 1rem;
    border-radius: 6px;
    background: #d1fae5;
    margin-bottom: 0.75rem;
    animation: pulse 1.5s infinite;
}
.skeleton.wide  { width: 80%; }
.skeleton.short { width: 50%; }
@keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:.4; } }
.error-msg {
    background: #fef2f2;
    color: #dc2626;
    border: 1px solid #fecaca;
    border-radius: 8px;
    padding: 0.75rem 1rem;
    font-size: 0.85rem;
}
.empty-msg {
    color: #9ca3af;
    font-size: 0.85rem;
    font-style: italic;
}
.card-list {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
}
.card {
    background: #fff;
    border: 1px solid #d1fae5;
    border-radius: 10px;
    padding: 0.85rem 1rem;
}
.expiring-card { border-left: 3px solid #d97706; }
.resolved-card { opacity: 0.8; }
.card-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 0.75rem;
}
.card-info {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    min-width: 0;
}
.card-name {
    font-weight: 600;
    font-size: 0.92rem;
    color: #111827;
}
.card-sub {
    font-size: 0.76rem;
    color: #6b7280;
}
.card-meta {
    margin-top: 0.35rem;
    font-size: 0.76rem;
    color: #9ca3af;
}
.card-statement {
    margin: 0.4rem 0 0;
    font-size: 0.82rem;
    color: #4b5563;
    font-style: italic;
}
.card-date {
    margin: 0.3rem 0 0;
    font-size: 0.74rem;
    color: #9ca3af;
}
.card-actions {
    display: flex;
    gap: 0.4rem;
    flex-shrink: 0;
}
.confirm-btn {
    background: #15803d;
    color: #fff;
    border: none;
    border-radius: 6px;
    padding: 0.3rem 0.7rem;
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
}
.confirm-btn:hover { background: #166534; }
.decline-btn {
    background: transparent;
    color: #dc2626;
    border: 1px solid #fca5a5;
    border-radius: 6px;
    padding: 0.3rem 0.7rem;
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
}
.decline-btn:hover { background: #fef2f2; }
.expiry-info {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.35rem;
    flex-shrink: 0;
}
.expiry-days {
    font-size: 0.78rem;
    font-weight: 700;
    color: #d97706;
    background: #fef3c7;
    border-radius: 5px;
    padding: 0.15rem 0.4rem;
}
.expiry-days.urgent {
    color: #dc2626;
    background: #fee2e2;
}
.unit-btn {
    background: transparent;
    color: #15803d;
    border: 1px solid #a7f3d0;
    border-radius: 6px;
    padding: 0.2rem 0.55rem;
    font-size: 0.76rem;
    cursor: pointer;
}
.unit-btn:hover { background: #f0fdf4; }
.status-badge {
    font-size: 0.74rem;
    font-weight: 700;
    text-transform: capitalize;
    padding: 0.2rem 0.55rem;
    border-radius: 5px;
    flex-shrink: 0;
}
.status-badge.confirmed {
    background: #dcfce7;
    color: #15803d;
}
.status-badge.declined {
    background: #fee2e2;
    color: #dc2626;
}
.status-badge.accepted {
    background: #fef9c3;
    color: #a16207;
}
.docket-card {
    border-left: 3px solid #ca8a04;
}
</style>
