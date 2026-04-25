<script lang="ts">
    import { getConstitution } from "../lib/api.js";
    import type { ConstitutionDocument } from "../lib/api.js";

    let doc: ConstitutionDocument | null = $state(null);
    let loading = $state(true);
    let error = $state("");

    $effect(() => {
        getConstitution()
            .then(d => { doc = d; })
            .catch(e => { error = e instanceof Error ? e.message : "Failed to load constitution"; })
            .finally(() => { loading = false; });
    });

    function formatValue(v: number | boolean): string {
        if (typeof v === "boolean") return v ? "Yes" : "No";
        if (Number.isInteger(v)) return v.toLocaleString();
        return v.toLocaleString(undefined, { maximumFractionDigits: 4 });
    }

    function authorityColor(a: string): string {
        switch (a) {
            case "immutable":    return "immutable";
            case "referendum":   return "referendum";
            case "assembly":     return "assembly";
            case "council":      return "council";
            case "commonwealth": return "commonwealth";
            default:             return "";
        }
    }
</script>

<div class="constitution-page">
    <h2 class="page-title">Constitution</h2>

    {#if loading}
        <div class="loading-msg">Loading…</div>
    {:else if error}
        <div class="loading-msg">{error}</div>
    {:else if doc}
        <div class="meta-card">
            <div class="meta-row"><span>Community</span><strong>{doc.communityName}</strong></div>
            <div class="meta-row"><span>Version</span><strong>{doc.version}</strong></div>
            <div class="meta-row">
                <span>Adopted</span>
                <strong>{new Date(doc.adoptedAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}</strong>
            </div>
            {#if doc.amendments.length > 0}
                <div class="meta-row"><span>Amendments</span><strong>{doc.amendments.length}</strong></div>
            {/if}
        </div>

        <h3 class="section-title">Parameters</h3>
        <div class="param-list">
            {#each Object.entries(doc.parameters) as [key, param]}
                <div class="param-row">
                    <div class="param-header">
                        <span class="param-key">{key}</span>
                        <span class="authority-badge {authorityColor(param.authority)}">{param.authority}</span>
                    </div>
                    <div class="param-desc">{param.description}</div>
                    <div class="param-value">{formatValue(param.value)}</div>
                </div>
            {/each}
        </div>

        {#if doc.authorityMap.length > 0}
            <h3 class="section-title">Governance Actions</h3>
            <div class="action-list">
                {#each doc.authorityMap as action}
                    <div class="action-row">
                        <div class="action-header">
                            <span class="action-name">{action.action}</span>
                            <span class="body-badge">{action.body}</span>
                        </div>
                        <div class="action-desc">{action.description}</div>
                    </div>
                {/each}
            </div>
        {/if}
    {/if}
</div>

<style>
    .constitution-page {
        padding: 1.5rem 1.5rem 6rem;
        max-width: 480px;
        margin: 0 auto;
    }

    @media (min-width: 768px) {
        .constitution-page { padding-bottom: 2rem; max-width: 900px; }
        .param-list {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 0.75rem;
        }
        .action-list {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 0.6rem;
        }
    }

    .page-title    { font-size: 1.4rem; font-weight: 700; color: #0f172a; margin: 0 0 1rem; }
    .section-title { font-size: 1rem; font-weight: 600; color: #475569; margin: 1.5rem 0 0.75rem; }

    .loading-msg { text-align: center; color: #94a3b8; padding: 3rem 0; font-size: 0.95rem; }

    .meta-card {
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 14px;
        overflow: hidden;
        margin-bottom: 0.5rem;
    }

    .meta-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.7rem 1.25rem;
        border-bottom: 1px solid #f1f5f9;
        font-size: 0.9rem;
        gap: 1rem;
    }

    .meta-row:last-child { border-bottom: none; }
    .meta-row span  { color: #64748b; }
    .meta-row strong { font-weight: 600; color: #0f172a; }

    /* Parameters */
    .param-list {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    .param-row {
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        padding: 0.9rem 1.1rem;
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
    }

    .param-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 0.5rem;
    }

    .param-key { font-size: 0.85rem; font-weight: 600; color: #0f172a; font-family: monospace; }

    .param-desc  { font-size: 0.8rem; color: #64748b; line-height: 1.4; }

    .param-value {
        font-size: 1rem;
        font-weight: 700;
        color: #15803d;
        font-variant-numeric: tabular-nums;
    }

    .authority-badge {
        font-size: 0.65rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        border-radius: 99px;
        padding: 0.15rem 0.5rem;
        flex-shrink: 0;
    }

    .authority-badge.immutable    { background: #f1f5f9; color: #64748b; }
    .authority-badge.referendum   { background: #dbeafe; color: #1d4ed8; }
    .authority-badge.assembly     { background: #dcfce7; color: #15803d; }
    .authority-badge.council      { background: #fef3c7; color: #d97706; }
    .authority-badge.commonwealth { background: #ede9fe; color: #7c3aed; }

    /* Actions */
    .action-list {
        display: flex;
        flex-direction: column;
        gap: 0.6rem;
    }

    .action-row {
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        padding: 0.85rem 1.1rem;
        display: flex;
        flex-direction: column;
        gap: 0.3rem;
    }

    .action-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 0.5rem;
    }

    .action-name { font-size: 0.85rem; font-weight: 600; color: #0f172a; font-family: monospace; }
    .action-desc { font-size: 0.8rem; color: #64748b; line-height: 1.4; }

    .body-badge {
        font-size: 0.65rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        border-radius: 99px;
        padding: 0.15rem 0.5rem;
        background: #f1f5f9;
        color: #475569;
        flex-shrink: 0;
    }
</style>
