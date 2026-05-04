<script lang="ts">
    import { getRoleType } from "../lib/api.js";
    import type { RoleTypeDto } from "../lib/api.js";
    import { currentPage, selectedRoleTypeId } from "../lib/session.js";

    let roleType: RoleTypeDto | null = $state(null);
    let loading = $state(true);
    let error = $state("");

    $effect(() => {
        const id = $selectedRoleTypeId;
        if (!id) return;
        loading = true;
        error = "";
        getRoleType(id)
            .then(rt => { roleType = rt; })
            .catch(e => { error = e instanceof Error ? e.message : "Failed to load role type"; })
            .finally(() => { loading = false; });
    });

    function fmt(n: number): string {
        return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
    }

    function back() {
        currentPage.go("registry");
    }
</script>

<div class="role-type-page">
    <button class="back-btn" onclick={back}>← Type Registry</button>

    {#if loading}
        <div class="skeleton-block"></div>
        <div class="skeleton-block short"></div>
        <div class="skeleton-block"></div>
    {:else if error}
        <div class="error-msg">{error}</div>
    {:else if roleType}
        <div class="header">
            <div class="header-top">
                <h2 class="title">{roleType.title}</h2>
                <span class="kin-badge">{fmt(roleType.defaultKinPerMonth)} kin / mo</span>
            </div>
            {#if roleType.category}
                <span class="category-badge">{roleType.category}</span>
            {/if}
        </div>

        {#if roleType.description}
            <p class="description">{roleType.description}</p>
        {/if}

        <div class="detail-grid">
            {#if roleType.responsibilities && roleType.responsibilities.length > 0}
                <section class="detail-section">
                    <h3 class="section-title">Responsibilities</h3>
                    <ul class="detail-list">
                        {#each roleType.responsibilities as item (item)}
                            <li>{item}</li>
                        {/each}
                    </ul>
                </section>
            {/if}

            {#if roleType.qualifications && roleType.qualifications.length > 0}
                <section class="detail-section">
                    <h3 class="section-title">Qualifications</h3>
                    <ul class="detail-list">
                        {#each roleType.qualifications as item (item)}
                            <li>{item}</li>
                        {/each}
                    </ul>
                </section>
            {/if}
        </div>

        {#if roleType.preferredUnitTypes && roleType.preferredUnitTypes.length > 0}
            <section class="detail-section">
                <h3 class="section-title">Preferred Unit Types</h3>
                <div class="unit-tags">
                    {#each roleType.preferredUnitTypes as put (put)}
                        <code class="unit-tag">{put}</code>
                    {/each}
                </div>
            </section>
        {/if}
    {/if}
</div>

<style>
    .role-type-page {
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
        margin-bottom: 0.4rem;
    }

    .title {
        font-size: 1.5rem;
        font-weight: 700;
        color: #0f172a;
        margin: 0;
    }

    .kin-badge {
        font-size: 0.82rem;
        font-weight: 600;
        color: #0369a1;
        background: #f0f9ff;
        border: 1px solid #bae6fd;
        border-radius: 20px;
        padding: 0.2rem 0.65rem;
        white-space: nowrap;
    }

    .category-badge {
        display: inline-block;
        font-size: 0.75rem;
        font-weight: 600;
        color: #15803d;
        background: #f0fdf4;
        border: 1px solid #bbf7d0;
        border-radius: 20px;
        padding: 0.15rem 0.55rem;
        text-transform: uppercase;
        letter-spacing: 0.04em;
    }

    .description {
        font-size: 0.95rem;
        color: #475569;
        line-height: 1.6;
        margin: 0 0 1.75rem;
    }

    .detail-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1.25rem;
        margin-bottom: 1.25rem;
    }

    @media (max-width: 560px) {
        .detail-grid {
            grid-template-columns: 1fr;
        }
    }

    .detail-section {
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        padding: 1rem 1.1rem;
    }

    .section-title {
        font-size: 0.82rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: #94a3b8;
        margin: 0 0 0.65rem;
    }

    .detail-list {
        margin: 0;
        padding-left: 1.2rem;
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
    }

    .detail-list li {
        font-size: 0.88rem;
        color: #334155;
        line-height: 1.5;
    }

    .unit-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 0.35rem;
    }

    .unit-tag {
        font-size: 0.75rem;
        color: #7c3aed;
        background: #f5f3ff;
        border: 1px solid #ddd6fe;
        border-radius: 4px;
        padding: 0.1rem 0.4rem;
        font-family: ui-monospace, monospace;
    }

    .skeleton-block {
        height: 120px;
        background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
        background-size: 200% 100%;
        animation: shimmer 1.4s infinite;
        border-radius: 10px;
        margin-bottom: 1rem;
    }

    .skeleton-block.short {
        height: 40px;
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
</style>
