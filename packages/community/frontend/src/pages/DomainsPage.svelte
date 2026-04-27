<script lang="ts">
    import { listDomains } from "../lib/api.js";
    import type { DomainDto } from "../lib/api.js";
    import { currentPage, selectedDomainId } from "../lib/session.js";

    let domains: DomainDto[] = $state([]);
    let loading = $state(true);
    let error = $state("");

    async function load() {
        loading = true;
        error = "";
        try {
            domains = await listDomains();
        } catch (e) {
            error = e instanceof Error ? e.message : "Failed to load domains";
        } finally {
            loading = false;
        }
    }

    $effect(() => { load(); });

    function openDomain(id: string) {
        selectedDomainId.set(id);
        currentPage.go("domain");
    }
</script>

<div class="domains-page">
    <h2 class="page-title">Domains</h2>
    <p class="page-subtitle">Functional domains that organise community life.</p>

    {#if loading}
        <div class="skeleton"></div>
        <div class="skeleton short"></div>
        <div class="skeleton"></div>
    {:else if error}
        <div class="error-msg">{error}</div>
    {:else if domains.length === 0}
        <div class="empty-msg">No domains registered.</div>
    {:else}
        <div class="domain-list">
            {#each domains as d (d.id)}
                <button class="domain-card" onclick={() => openDomain(d.id)}>
                    <div class="domain-card-body">
                        <span class="domain-name">{d.name}</span>
                        {#if d.description}
                            <span class="domain-desc">{d.description}</span>
                        {/if}
                    </div>
                    <div class="domain-meta">
                        <span class="unit-count">{d.unitIds.length} unit{d.unitIds.length !== 1 ? "s" : ""}</span>
                        <span class="chevron">›</span>
                    </div>
                </button>
            {/each}
        </div>
        <p class="count">{domains.length} domain{domains.length !== 1 ? "s" : ""}</p>
    {/if}
</div>

<style>
    .domains-page {
        padding: 1.5rem 1.5rem 6rem;
        max-width: 480px;
        margin: 0 auto;
    }

    @media (min-width: 768px) {
        .domains-page { padding-bottom: 2rem; max-width: 800px; }
        .domain-list {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 0.75rem;
        }
        .domain-card { border-radius: 0.75rem; border: 1px solid #e2e8f0; }
    }

    .page-title {
        font-size: 1.4rem;
        font-weight: 700;
        color: #0f172a;
        margin: 0 0 0.25rem;
    }

    .page-subtitle {
        font-size: 0.875rem;
        color: #64748b;
        margin: 0 0 1.25rem;
    }

    .domain-list {
        display: flex;
        flex-direction: column;
    }

    .domain-card {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        width: 100%;
        padding: 1rem 0;
        background: none;
        border: none;
        border-bottom: 1px solid #f1f5f9;
        cursor: pointer;
        text-align: left;
        color: inherit;
    }

    .domain-card:active { background: #f8fafc; }

    .domain-card-body {
        display: flex;
        flex-direction: column;
        gap: 0.2rem;
        min-width: 0;
    }

    .domain-name {
        font-size: 1rem;
        font-weight: 600;
        color: #0f172a;
    }

    .domain-desc {
        font-size: 0.8rem;
        color: #64748b;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 28ch;
    }

    .domain-meta {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        flex-shrink: 0;
    }

    .unit-count {
        font-size: 0.75rem;
        color: #94a3b8;
    }

    .chevron {
        font-size: 1.2rem;
        color: #cbd5e1;
        line-height: 1;
    }

    .count {
        font-size: 0.8rem;
        color: #94a3b8;
        text-align: center;
        margin-top: 1rem;
    }

    .skeleton {
        height: 3rem;
        border-radius: 0.5rem;
        background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
        background-size: 200% 100%;
        animation: shimmer 1.2s infinite;
        margin-bottom: 0.5rem;
    }
    .skeleton.short { width: 60%; }

    @keyframes shimmer {
        0%   { background-position: 200% 0; }
        100% { background-position: -200% 0; }
    }

    .error-msg, .empty-msg {
        font-size: 0.9rem;
        color: #ef4444;
        padding: 1rem 0;
    }
    .empty-msg { color: #94a3b8; }
</style>
