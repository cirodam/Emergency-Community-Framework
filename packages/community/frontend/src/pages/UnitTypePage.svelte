<script lang="ts">
    import { listRoleTypes } from "../lib/api.js";
    import type { RoleTypeDto } from "../lib/api.js";
    import { currentPage, selectedUnitType, selectedRoleTypeId } from "../lib/session.js";

    const ut = $derived($selectedUnitType);

    let roleTypes: RoleTypeDto[] = $state([]);
    let loadingRoles = $state(true);

    $effect(() => {
        listRoleTypes()
            .then(rts => { roleTypes = rts; })
            .catch(() => {})
            .finally(() => { loadingRoles = false; });
    });

    const preferringRoles = $derived(
        ut
            ? roleTypes.filter(rt => rt.preferredUnitTypes?.includes(ut.type))
            : []
    );

    function fmt(n: number): string {
        return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
    }

    function openRoleType(id: string) {
        selectedRoleTypeId.set(id);
        currentPage.go("role-type");
    }

    function back() {
        currentPage.go("registry");
    }
</script>

<div class="unit-type-page">
    <button class="back-btn" onclick={back}>← Type Registry</button>

    {#if !ut}
        <div class="error-msg">No unit type selected.</div>
    {:else}
        <div class="header">
            <div class="header-top">
                <h2 class="title">{ut.label}</h2>
                {#if ut.custom}
                    <span class="badge badge-custom">custom</span>
                {:else}
                    <span class="badge badge-builtin">built-in</span>
                {/if}
            </div>
            <code class="type-key">{ut.type}</code>
        </div>

        {#if ut.description}
            <p class="description">{ut.description}</p>
        {/if}

        <section class="roles-section">
            <h3 class="section-title">Roles that prefer this unit type</h3>
            {#if loadingRoles}
                <p class="muted">Loading…</p>
            {:else if preferringRoles.length === 0}
                <p class="muted">No standard role types are specifically associated with this unit type.</p>
            {:else}
                <ul class="role-list">
                    {#each preferringRoles as rt (rt.id)}
                        <li>
                            <button class="role-item" onclick={() => openRoleType(rt.id)}>
                                <span class="role-title">{rt.title}</span>
                                {#if rt.category}
                                    <span class="role-category">{rt.category}</span>
                                {/if}
                                <span class="role-kin">{fmt(rt.defaultKinPerMonth)} kin/mo</span>
                            </button>
                        </li>
                    {/each}
                </ul>
            {/if}
        </section>
    {/if}
</div>

<style>
    .unit-type-page {
        padding: 1.5rem 1rem 6rem;
        max-width: 720px;
        margin: 0 auto;
    }

    .back-btn {
        background: none;
        border: none;
        color: #0369a1;
        font-size: 0.88rem;
        cursor: pointer;
        padding: 0;
        margin-bottom: 1.5rem;
        display: inline-block;
    }

    .back-btn:hover {
        text-decoration: underline;
    }

    .header {
        margin-bottom: 1rem;
    }

    .header-top {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        flex-wrap: wrap;
    }

    .title {
        font-size: 1.5rem;
        font-weight: 700;
        color: #1a202c;
        margin: 0;
    }

    .badge {
        font-size: 0.72rem;
        font-weight: 600;
        padding: 0.2rem 0.55rem;
        border-radius: 999px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    .badge-custom {
        background: #fef9c3;
        color: #713f12;
    }

    .badge-builtin {
        background: #f0fdf4;
        color: #166534;
    }

    .type-key {
        display: inline-block;
        margin-top: 0.4rem;
        font-size: 0.82rem;
        background: #f1f5f9;
        color: #475569;
        padding: 0.2rem 0.5rem;
        border-radius: 4px;
    }

    .description {
        font-size: 0.975rem;
        color: #4a5568;
        line-height: 1.7;
        margin: 1rem 0 1.5rem;
    }

    .roles-section {
        margin-top: 1.5rem;
    }

    .section-title {
        font-size: 0.8rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: #a0aec0;
        margin: 0 0 0.75rem;
    }

    .muted {
        font-size: 0.9rem;
        color: #a0aec0;
    }

    .role-list {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 0.1rem;
    }

    .role-item {
        width: 100%;
        display: flex;
        align-items: center;
        gap: 0.6rem;
        flex-wrap: wrap;
        padding: 0.65rem 0;
        border: none;
        border-bottom: 1px solid #f0f0f0;
        background: none;
        cursor: pointer;
        text-align: left;
    }

    .role-item:last-of-type {
        border-bottom: none;
    }

    .role-item:hover .role-title {
        text-decoration: underline;
        color: #0369a1;
    }

    .role-title {
        font-size: 0.95rem;
        font-weight: 500;
        color: #1a202c;
        flex: 1;
    }

    .role-category {
        font-size: 0.78rem;
        color: #718096;
        background: #f7fafc;
        border: 1px solid #e2e8f0;
        border-radius: 999px;
        padding: 0.1rem 0.5rem;
    }

    .role-kin {
        font-size: 0.82rem;
        font-weight: 600;
        color: #2f855a;
        white-space: nowrap;
    }

    .error-msg {
        color: #c53030;
        font-size: 0.95rem;
    }
</style>
