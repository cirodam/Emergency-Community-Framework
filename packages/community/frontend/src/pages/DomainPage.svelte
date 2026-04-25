<script lang="ts">
    import { getDomain, listUnits } from "../lib/api.js";
    import type { DomainDto, UnitDto } from "../lib/api.js";
    import { currentPage, selectedDomainId } from "../lib/session.js";

    let domain: DomainDto | null = $state(null);
    let units: UnitDto[] = $state([]);
    let loading = $state(true);
    let error = $state("");

    async function load(id: string) {
        loading = true;
        error = "";
        try {
            const [d, allUnits] = await Promise.all([getDomain(id), listUnits()]);
            domain = d;
            units = allUnits.filter(u => d.unitIds.includes(u.id));
        } catch (e) {
            error = e instanceof Error ? e.message : "Failed to load domain";
        } finally {
            loading = false;
        }
    }

    $effect(() => {
        const id = $selectedDomainId;
        if (id) load(id);
    });

    function back() {
        currentPage.go("domains");
    }

    function fmt(date: string): string {
        return new Date(date).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
    }
</script>

<div class="domain-page">
    <div class="page-header">
        <button class="back-btn" onclick={back} aria-label="Back to domains">‹ Governance</button>
    </div>

    {#if loading}
        <div class="skeleton wide"></div>
        <div class="skeleton short"></div>
        <div class="skeleton"></div>
        <div class="skeleton"></div>
    {:else if error}
        <div class="error-msg">{error}</div>
    {:else if domain}
        <div class="domain-header">
            <h2 class="domain-name">{domain.name}</h2>
            {#if domain.description}
                <p class="domain-desc">{domain.description}</p>
            {/if}
        </div>

        <section class="units-section">
            <h3 class="section-title">Functional Units</h3>

            {#if units.length === 0}
                <p class="empty-msg">No units in this domain yet.</p>
            {:else}
                <div class="unit-list">
                    {#each units as unit (unit.id)}
                        <div class="unit-card">
                            <div class="unit-header">
                                <span class="unit-name">{unit.name}</span>
                                <span class="unit-type">{unit.type}</span>
                            </div>
                            {#if unit.description}
                                <p class="unit-desc">{unit.description}</p>
                            {/if}
                            <div class="unit-footer">
                                <span class="unit-stat">{unit.personIds.length} member{unit.personIds.length !== 1 ? "s" : ""}</span>
                                <span class="unit-stat">{unit.roleIds.length} role{unit.roleIds.length !== 1 ? "s" : ""}</span>
                                <span class="unit-date">Since {fmt(unit.createdAt)}</span>
                            </div>
                        </div>
                    {/each}
                </div>
            {/if}
        </section>
    {/if}
</div>

<style>
    .domain-page {
        padding: 1rem 1.5rem 6rem;
        max-width: 480px;
        margin: 0 auto;
    }

    @media (min-width: 768px) {
        .domain-page { padding-bottom: 2rem; max-width: 800px; }
    }

    .page-header { margin-bottom: 1.25rem; }

    .back-btn {
        background: none;
        border: none;
        cursor: pointer;
        font-size: 0.9rem;
        color: #3b82f6;
        padding: 0;
    }

    .domain-header { margin-bottom: 1.75rem; }

    .domain-name {
        font-size: 1.5rem;
        font-weight: 700;
        color: #0f172a;
        margin: 0 0 0.4rem;
    }

    .domain-desc {
        font-size: 0.9rem;
        color: #475569;
        margin: 0;
        line-height: 1.5;
    }

    .section-title {
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: #94a3b8;
        margin: 0 0 0.75rem;
    }

    .unit-list {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    @media (min-width: 768px) {
        .unit-list {
            display: grid;
            grid-template-columns: 1fr 1fr;
        }
    }

    .unit-card {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 0.75rem;
        padding: 1rem 1.1rem;
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
    }

    .unit-header {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 0.5rem;
    }

    .unit-name {
        font-size: 0.95rem;
        font-weight: 600;
        color: #0f172a;
    }

    .unit-type {
        font-size: 0.7rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: #64748b;
        background: #e2e8f0;
        padding: 0.15rem 0.5rem;
        border-radius: 9999px;
        flex-shrink: 0;
    }

    .unit-desc {
        font-size: 0.82rem;
        color: #475569;
        margin: 0;
        line-height: 1.45;
    }

    .unit-footer {
        display: flex;
        gap: 0.75rem;
        margin-top: 0.25rem;
    }

    .unit-stat {
        font-size: 0.75rem;
        color: #64748b;
    }

    .unit-date {
        font-size: 0.75rem;
        color: #94a3b8;
        margin-left: auto;
    }

    .empty-msg {
        font-size: 0.875rem;
        color: #94a3b8;
        padding: 0.5rem 0;
    }

    .skeleton {
        height: 2.5rem;
        border-radius: 0.5rem;
        background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
        background-size: 200% 100%;
        animation: shimmer 1.2s infinite;
        margin-bottom: 0.5rem;
    }
    .skeleton.wide { height: 2rem; width: 70%; }
    .skeleton.short { width: 45%; height: 1.2rem; }

    @keyframes shimmer {
        0%   { background-position: 200% 0; }
        100% { background-position: -200% 0; }
    }

    .error-msg {
        font-size: 0.9rem;
        color: #ef4444;
        padding: 1rem 0;
    }
</style>
