<script lang="ts">
    import { listUnitTypes, listRoleTypes } from "../lib/api.js";
    import type { UnitTypeDto, RoleTypeDto } from "../lib/api.js";
    import { currentPage, selectedRoleTypeId } from "../lib/session.js";

    let unitTypes: UnitTypeDto[] = $state([] as UnitTypeDto[]);
    let roleTypes: RoleTypeDto[] = $state([] as RoleTypeDto[]);
    let loading = $state(true);
    let error = $state("");

    async function load() {
        loading = true;
        error = "";
        try {
            const [units, roles] = await Promise.all([listUnitTypes(), listRoleTypes()]);
            unitTypes = units;
            roleTypes = roles;
        } catch (e) {
            error = e instanceof Error ? e.message : "Failed to load registry";
        } finally {
            loading = false;
        }
    }

    $effect(() => { load(); });

    function fmt(n: number): string {
        return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
    }

    function openRoleType(id: string) {
        selectedRoleTypeId.set(id);
        currentPage.go("role-type");
    }
</script>

<div class="registry-page">
    <h2 class="page-title">Type Registry</h2>
    <p class="page-subtitle">Templates from which functional units and community roles are instantiated. Types are added and removed via governance motions.</p>

    {#if loading}
        <div class="section">
            <h3 class="section-title">Unit Types</h3>
            <div class="card-grid">
                <div class="skeleton"></div>
                <div class="skeleton"></div>
                <div class="skeleton"></div>
            </div>
        </div>
        <div class="section">
            <h3 class="section-title">Role Types</h3>
            <div class="card-grid">
                <div class="skeleton"></div>
                <div class="skeleton"></div>
            </div>
        </div>
    {:else if error}
        <div class="error-msg">{error}</div>
    {:else}
        <div class="section">
            <h3 class="section-title">Unit Types</h3>
            <p class="section-hint">Deploy instances of these via the <em>deploy-unit</em> governance motion.</p>
            {#if unitTypes.length === 0}
                <div class="empty-msg">No unit types registered.</div>
            {:else}
                <div class="card-grid">
                    {#each unitTypes as ut (ut.type)}
                        <div class="type-card">
                            <div class="card-header">
                                <span class="type-label">{ut.label}</span>
                                {#if ut.custom}
                                    <span class="badge badge-custom">custom</span>
                                {:else}
                                    <span class="badge badge-builtin">built-in</span>
                                {/if}
                            </div>
                            <code class="type-key">{ut.type}</code>
                            {#if ut.description}
                                <p class="type-desc">{ut.description}</p>
                            {/if}
                        </div>
                    {/each}
                </div>
                <p class="count">{unitTypes.length} unit type{unitTypes.length !== 1 ? "s" : ""}</p>
            {/if}
        </div>

        <div class="section">
            <h3 class="section-title">Role Types</h3>
            <p class="section-hint">Role types define standard positions. Instances are created within units via the <em>add-role-type</em> governance motion.</p>
            {#if roleTypes.length === 0}
                <div class="empty-msg">No role types registered.</div>
            {:else}
                <div class="card-grid">
                    {#each roleTypes as rt (rt.id)}
                        <button class="type-card type-card-btn" onclick={() => openRoleType(rt.id)}>
                            <div class="card-header">
                                <span class="type-label">{rt.title}</span>
                                <span class="kin-badge">{fmt(rt.defaultKinPerMonth)} kin/mo</span>
                            </div>
                            {#if rt.description}
                                <p class="type-desc">{rt.description}</p>
                            {/if}
                            {#if rt.preferredUnitTypes.length > 0}
                                <div class="preferred-units">
                                    <span class="preferred-label">Preferred units:</span>
                                    {#each rt.preferredUnitTypes as put (put)}
                                        <code class="unit-tag">{put}</code>
                                    {/each}
                                </div>
                            {/if}
                        </button>
                    {/each}
                </div>
                <p class="count">{roleTypes.length} role type{roleTypes.length !== 1 ? "s" : ""}</p>
            {/if}
        </div>
    {/if}
</div>

<style>
    .registry-page {
        padding: 1.5rem 1rem 6rem;
        max-width: 960px;
        margin: 0 auto;
    }

    .page-title {
        font-size: 1.4rem;
        font-weight: 700;
        color: #0f172a;
        margin: 0 0 0.25rem;
    }

    .page-subtitle {
        font-size: 0.88rem;
        color: #64748b;
        margin: 0 0 2rem;
    }

    .section {
        margin-bottom: 2.5rem;
    }

    .section-title {
        font-size: 1.05rem;
        font-weight: 600;
        color: #0f172a;
        margin: 0 0 0.25rem;
    }

    .section-hint {
        font-size: 0.82rem;
        color: #64748b;
        margin: 0 0 1rem;
    }

    .card-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
        gap: 0.75rem;
    }

    .type-card {
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        padding: 1rem;
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
    }

    .type-card-btn {
        cursor: pointer;
        text-align: left;
        transition: border-color 0.15s, box-shadow 0.15s;
        font: inherit;
    }

    .type-card-btn:hover {
        border-color: #94a3b8;
        box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    }

    .card-header {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        flex-wrap: wrap;
    }

    .type-label {
        font-weight: 600;
        font-size: 0.95rem;
        color: #0f172a;
        flex: 1;
    }

    .type-key {
        font-size: 0.75rem;
        color: #64748b;
        background: #f1f5f9;
        border-radius: 4px;
        padding: 0.1rem 0.35rem;
        font-family: ui-monospace, monospace;
    }

    .type-desc {
        font-size: 0.83rem;
        color: #475569;
        margin: 0;
        line-height: 1.45;
    }

    .badge {
        font-size: 0.68rem;
        font-weight: 600;
        padding: 0.1rem 0.45rem;
        border-radius: 20px;
        text-transform: uppercase;
        letter-spacing: 0.03em;
        white-space: nowrap;
    }

    .badge-builtin {
        background: #f0fdf4;
        color: #15803d;
        border: 1px solid #bbf7d0;
    }

    .badge-custom {
        background: #eff6ff;
        color: #1d4ed8;
        border: 1px solid #bfdbfe;
    }

    .kin-badge {
        font-size: 0.75rem;
        font-weight: 600;
        color: #0369a1;
        background: #f0f9ff;
        border: 1px solid #bae6fd;
        border-radius: 20px;
        padding: 0.1rem 0.5rem;
        white-space: nowrap;
    }

    .preferred-units {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.3rem;
        margin-top: 0.2rem;
    }

    .preferred-label {
        font-size: 0.75rem;
        color: #94a3b8;
    }

    .unit-tag {
        font-size: 0.7rem;
        color: #7c3aed;
        background: #f5f3ff;
        border: 1px solid #ddd6fe;
        border-radius: 4px;
        padding: 0.05rem 0.3rem;
        font-family: ui-monospace, monospace;
    }

    .skeleton {
        height: 100px;
        background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
        background-size: 200% 100%;
        animation: shimmer 1.4s infinite;
        border-radius: 10px;
    }

    @keyframes shimmer {
        0%   { background-position: 200% 0; }
        100% { background-position: -200% 0; }
    }

    .error-msg {
        color: #dc2626;
        font-size: 0.9rem;
        padding: 0.75rem 1rem;
        background: #fef2f2;
        border-radius: 8px;
    }

    .empty-msg {
        color: #94a3b8;
        font-size: 0.88rem;
        padding: 1rem;
        text-align: center;
        background: #f8fafc;
        border-radius: 8px;
    }

    .count {
        font-size: 0.78rem;
        color: #94a3b8;
        margin: 0.5rem 0 0;
    }
</style>
