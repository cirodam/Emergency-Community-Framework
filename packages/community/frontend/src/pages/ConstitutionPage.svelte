<script lang="ts">
    import {
        getConstitution,
        updateConstitutionParameter,
        updateConstitutionSection,
    } from "../lib/api.js";
    import type { ConstitutionDocument, ConstitutionParam, DocumentSection } from "../lib/api.js";
    import { currentPage, session } from "../lib/session.js";

    let doc: ConstitutionDocument | null = $state(null);
    let loading = $state(true);
    let error = $state("");

    // Param editing
    let editingParamKey = $state<string | null>(null);
    let editParamRaw    = $state(""); // raw input string
    let paramSaving     = $state(false);
    let paramSaveError  = $state("");

    // Section editing
    let editingSectionId  = $state<string | null>(null);
    let editSectionBody   = $state("");
    let sectionSaving     = $state(false);
    let sectionSaveError  = $state("");

    const isSteward = $derived($session?.isSteward ?? false);

    $effect(() => {
        getConstitution()
            .then(d => { doc = d; })
            .catch(e => { error = e instanceof Error ? e.message : "Failed to load constitution"; })
            .finally(() => { loading = false; });
    });

    // ── Helpers ───────────────────────────────────────────────────────────────

    function isRateParam(p: ConstitutionParam): boolean {
        if (typeof p.value !== "number") return false;
        return p.value > 0 && p.value < 1 && (p.constraints?.max ?? 2) <= 1;
    }

    function fmtParam(key: string, params: Record<string, ConstitutionParam>): string {
        const p = params[key];
        if (!p) return `{${key}}`;
        const v = p.value;
        if (typeof v === "boolean") return v ? "guaranteed" : "disabled";
        if (isRateParam(p)) {
            const pct = v * 100;
            return `${pct % 1 === 0 ? pct.toFixed(0) : pct.toFixed(1)}%`;
        }
        return Number.isInteger(v) ? v.toLocaleString() : v.toLocaleString(undefined, { maximumFractionDigits: 4 });
    }

    type Segment = { type: "text"; content: string } | { type: "param"; key: string };

    function parseBody(body: string): Segment[] {
        const segments: Segment[] = [];
        const parts = body.split(/\{([^}]+)\}/g);
        for (let i = 0; i < parts.length; i++) {
            if (i % 2 === 0) {
                if (parts[i]) segments.push({ type: "text", content: parts[i] });
            } else {
                segments.push({ type: "param", key: parts[i] });
            }
        }
        return segments;
    }

    function canEditParam(key: string, params: Record<string, ConstitutionParam>): boolean {
        return isSteward && (params[key]?.authority ?? "immutable") !== "immutable";
    }

    function canEditSection(section: DocumentSection): boolean {
        return isSteward && section.amendAuthority !== "immutable";
    }

    function startEditParam(key: string, params: Record<string, ConstitutionParam>) {
        if (!canEditParam(key, params)) return;
        const p = params[key];
        if (typeof p.value === "number") {
            editParamRaw = isRateParam(p)
                ? String((p.value * 100).toFixed(2))
                : String(p.value);
        } else {
            editParamRaw = String(p.value);
        }
        paramSaveError = "";
        editingParamKey = key;
    }

    async function saveParam() {
        if (!doc || !editingParamKey) return;
        const p = doc.parameters[editingParamKey];
        let newValue: number | boolean;
        if (typeof p.value === "boolean") {
            newValue = editParamRaw === "true";
        } else {
            const raw = parseFloat(editParamRaw);
            if (isNaN(raw)) { paramSaveError = "Enter a valid number"; return; }
            newValue = isRateParam(p) ? raw / 100 : raw;
        }
        paramSaving = true;
        paramSaveError = "";
        try {
            await updateConstitutionParameter(editingParamKey, newValue);
            // Optimistically update local copy
            doc = {
                ...doc,
                parameters: {
                    ...doc.parameters,
                    [editingParamKey]: { ...p, value: newValue },
                },
            };
            editingParamKey = null;
        } catch (e) {
            paramSaveError = e instanceof Error ? e.message : "Failed to save";
        } finally {
            paramSaving = false;
        }
    }

    function startEditSection(section: DocumentSection) {
        editSectionBody = section.body;
        sectionSaveError = "";
        editingSectionId = section.id;
    }

    async function saveSection() {
        if (!doc || !editingSectionId) return;
        sectionSaving = true;
        sectionSaveError = "";
        try {
            const updated = await updateConstitutionSection(editingSectionId, editSectionBody);
            doc = updated;
            editingSectionId = null;
        } catch (e) {
            sectionSaveError = e instanceof Error ? e.message : "Failed to save";
        } finally {
            sectionSaving = false;
        }
    }

    function formatDate(iso: string): string {
        return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
    }

    function authorityLabel(a: string): string {
        const map: Record<string, string> = {
            immutable: "Immutable", referendum: "Referendum", assembly: "Assembly",
            council: "Council", commonwealth: "Commonwealth",
        };
        return map[a] ?? a;
    }
</script>

<div class="constitution-page">
    <div class="page-header">
        <button class="back-btn" onclick={() => currentPage.go("governance")}>‹ Governance</button>
    </div>

    {#if loading}
        <div class="state-msg">Loading…</div>
    {:else if error}
        <div class="state-msg error">{error}</div>
    {:else if doc}

        <!-- Document header -->
        <div class="doc-header">
            <div class="doc-meta-row">
                <span class="doc-meta-label">Version {doc.version}</span>
                <span class="doc-meta-sep">·</span>
                <span class="doc-meta-label">Adopted {formatDate(doc.adoptedAt)}</span>
                {#if doc.amendments.length > 0}
                    <span class="doc-meta-sep">·</span>
                    <span class="doc-meta-label">{doc.amendments.length} amendment{doc.amendments.length !== 1 ? "s" : ""}</span>
                {/if}
            </div>
            <h1 class="doc-title">Constitution of {doc.communityName}</h1>
        </div>

        <!-- Articles -->
        {#each (doc.articles ?? []) as article}
            <section class="article">
                <h2 class="article-heading">
                    <span class="article-number">Article {article.number}</span>
                    {article.title}
                </h2>
                {#if article.preamble}
                    <p class="article-preamble">{article.preamble}</p>
                {/if}

                {#each article.sections as section}
                    <div class="doc-section">
                        {#if section.title}
                            <h3 class="section-heading">
                                <span class="section-id">§ {section.id}</span>
                                {section.title}
                            </h3>
                        {/if}

                        {#if editingSectionId === section.id}
                            <!-- Section edit mode -->
                            <div class="section-edit-area">
                                <textarea
                                    class="section-textarea"
                                    rows={6}
                                    bind:value={editSectionBody}
                                    placeholder="Write section prose. Use {'{paramKey}'} to embed live values."
                                    disabled={sectionSaving}
                                ></textarea>
                                <p class="edit-hint">Use {"{paramKey}"} to embed a live constitutional value inline.</p>
                                {#if sectionSaveError}
                                    <p class="edit-error">{sectionSaveError}</p>
                                {/if}
                                <div class="edit-actions">
                                    <button class="save-btn" onclick={saveSection} disabled={sectionSaving}>
                                        {sectionSaving ? "Saving…" : "Save"}
                                    </button>
                                    <button class="cancel-btn" onclick={() => editingSectionId = null} disabled={sectionSaving}>
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        {:else}
                            <!-- Section read mode -->
                            <div class="section-body">
                                {#each parseBody(section.body) as seg}
                                    {#if seg.type === "text"}
                                        {seg.content}
                                    {:else}
                                        <!-- param chip -->
                                        {#if editingParamKey === seg.key}
                                            <span class="param-inline-edit">
                                                <input
                                                    class="param-input"
                                                    type="number"
                                                    bind:value={editParamRaw}
                                                    step={isRateParam(doc.parameters[seg.key]) ? "0.1" : "1"}
                                                    disabled={paramSaving}
                                                    onkeydown={e => { if (e.key === "Enter") saveParam(); if (e.key === "Escape") editingParamKey = null; }}
                                                />
                                                {#if isRateParam(doc.parameters[seg.key])}
                                                    <span class="param-input-unit">%</span>
                                                {/if}
                                                <button class="param-confirm" onclick={saveParam} disabled={paramSaving} title="Save">✓</button>
                                                <button class="param-cancel"  onclick={() => editingParamKey = null} title="Cancel">✕</button>
                                                {#if paramSaveError}
                                                    <span class="param-error">{paramSaveError}</span>
                                                {/if}
                                            </span>
                                        {:else}
                                            <button
                                                class="param-chip"
                                                class:editable={canEditParam(seg.key, doc.parameters)}
                                                title={doc.parameters[seg.key]?.description ?? seg.key}
                                                onclick={() => startEditParam(seg.key, doc.parameters)}
                                                disabled={!canEditParam(seg.key, doc.parameters)}
                                            >{fmtParam(seg.key, doc.parameters)}</button>
                                        {/if}
                                    {/if}
                                {/each}
                            </div>
                            {#if canEditSection(section)}
                                <button class="section-edit-btn" onclick={() => startEditSection(section)}>
                                    Edit prose
                                </button>
                            {/if}
                        {/if}
                    </div>
                {/each}
            </section>
        {/each}

        <!-- Authority map -->
        {#if doc.authorityMap.length > 0}
            <section class="article authority-section">
                <h2 class="article-heading">
                    <span class="article-number">Appendix</span>
                    Governance Actions
                </h2>
                <div class="action-grid">
                    {#each doc.authorityMap as action}
                        <div class="action-row">
                            <div class="action-top">
                                <code class="action-name">{action.action}</code>
                                <span class="body-badge body-{action.body}">{action.body}</span>
                            </div>
                            <p class="action-desc">{action.description}</p>
                        </div>
                    {/each}
                </div>
            </section>
        {/if}

        <!-- Amendment history -->
        {#if doc.amendments.length > 0}
            <section class="article">
                <h2 class="article-heading">
                    <span class="article-number">History</span>
                    Amendments
                </h2>
                <div class="amendment-list">
                    {#each doc.amendments as a}
                        <div class="amendment-row">
                            <span class="amend-version">v{a.version}</span>
                            <span class="amend-key">{a.parameter}</span>
                            <span class="amend-change">{a.oldValue} → {a.newValue}</span>
                            <span class="amend-date">{formatDate(a.amendedAt)}</span>
                        </div>
                    {/each}
                </div>
            </section>
        {/if}

    {/if}
</div>

<style>
    .constitution-page {
        padding: 1.5rem 1.25rem 6rem;
        max-width: 680px;
        margin: 0 auto;
    }

    .page-header { margin-bottom: 1.5rem; }

    .back-btn {
        background: none;
        border: none;
        cursor: pointer;
        font-size: 0.9rem;
        color: #15803d;
        padding: 0;
    }

    .state-msg {
        color: #64748b;
        font-size: 0.9rem;
        margin-top: 2rem;
        text-align: center;
    }
    .state-msg.error { color: #dc2626; }

    /* ── Document header ──────────────────────────────────────────────── */

    .doc-header {
        margin-bottom: 2.5rem;
        border-bottom: 2px solid #15803d;
        padding-bottom: 1.25rem;
    }

    .doc-meta-row {
        display: flex;
        flex-wrap: wrap;
        gap: 0.25rem 0.5rem;
        margin-bottom: 0.5rem;
    }

    .doc-meta-label {
        font-size: 0.75rem;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.06em;
    }

    .doc-meta-sep { color: #cbd5e1; font-size: 0.75rem; }

    .doc-title {
        font-size: 1.5rem;
        font-weight: 700;
        color: #0f172a;
        line-height: 1.3;
        margin: 0;
    }

    /* ── Articles ─────────────────────────────────────────────────────── */

    .article {
        margin-bottom: 2.5rem;
    }

    .article-heading {
        font-size: 1rem;
        font-weight: 700;
        color: #0f172a;
        margin: 0 0 0.75rem;
        display: flex;
        flex-direction: column;
        gap: 0.1rem;
    }

    .article-number {
        font-size: 0.7rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: #15803d;
    }

    .article-preamble {
        font-size: 0.875rem;
        color: #475569;
        line-height: 1.65;
        margin: 0 0 1rem;
        font-style: italic;
        border-left: 3px solid #bbf7d0;
        padding-left: 0.75rem;
    }

    /* ── Sections ─────────────────────────────────────────────────────── */

    .doc-section {
        margin-bottom: 1.25rem;
        position: relative;
    }

    .section-heading {
        font-size: 0.8rem;
        font-weight: 600;
        color: #475569;
        margin: 0 0 0.35rem;
        display: flex;
        gap: 0.4rem;
        align-items: baseline;
    }

    .section-id {
        color: #15803d;
        font-weight: 700;
        font-variant-numeric: tabular-nums;
    }

    .section-body {
        font-size: 0.9rem;
        color: #1e293b;
        line-height: 1.75;
    }

    /* ── Param chips ──────────────────────────────────────────────────── */

    .param-chip {
        display: inline;
        background: #dcfce7;
        color: #15803d;
        border: 1px solid #a7f3d0;
        border-radius: 4px;
        padding: 0.05rem 0.35rem;
        font-size: 0.875rem;
        font-weight: 600;
        font-variant-numeric: tabular-nums;
        line-height: inherit;
        cursor: default;
        vertical-align: baseline;
    }

    .param-chip.editable {
        cursor: pointer;
    }

    .param-chip.editable:hover {
        background: #bbf7d0;
        border-color: #86efac;
    }

    .param-chip:disabled {
        /* non-editable chips look static */
        cursor: default;
    }

    /* ── Inline param edit ────────────────────────────────────────────── */

    .param-inline-edit {
        display: inline-flex;
        align-items: center;
        gap: 0.2rem;
        vertical-align: baseline;
    }

    .param-input {
        width: 5.5rem;
        padding: 0.1rem 0.35rem;
        border: 1px solid #86efac;
        border-radius: 4px;
        font-size: 0.875rem;
        font-weight: 600;
        color: #15803d;
        background: #f0fdf4;
        text-align: right;
    }

    .param-input-unit {
        font-size: 0.8rem;
        color: #15803d;
        font-weight: 600;
    }

    .param-confirm, .param-cancel {
        background: none;
        border: none;
        cursor: pointer;
        font-size: 0.85rem;
        padding: 0 0.15rem;
        line-height: 1;
    }

    .param-confirm { color: #15803d; }
    .param-cancel  { color: #94a3b8; }

    .param-error {
        font-size: 0.75rem;
        color: #dc2626;
    }

    /* ── Section edit ─────────────────────────────────────────────────── */

    .section-edit-btn {
        margin-top: 0.35rem;
        background: none;
        border: 1px solid #d1fae5;
        border-radius: 6px;
        color: #15803d;
        font-size: 0.75rem;
        padding: 0.2rem 0.6rem;
        cursor: pointer;
        opacity: 0.7;
    }

    .section-edit-btn:hover { opacity: 1; background: #f0fdf4; }

    .section-edit-area {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .section-textarea {
        width: 100%;
        border: 1px solid #86efac;
        border-radius: 8px;
        padding: 0.75rem;
        font-size: 0.875rem;
        line-height: 1.65;
        resize: vertical;
        color: #1e293b;
        background: #f0fdf4;
        font-family: inherit;
        box-sizing: border-box;
    }

    .edit-hint {
        font-size: 0.75rem;
        color: #64748b;
        margin: 0;
    }

    .edit-error {
        font-size: 0.8rem;
        color: #dc2626;
        margin: 0;
    }

    .edit-actions {
        display: flex;
        gap: 0.5rem;
    }

    .save-btn {
        background: #15803d;
        color: #fff;
        border: none;
        border-radius: 8px;
        padding: 0.4rem 1rem;
        font-size: 0.85rem;
        font-weight: 600;
        cursor: pointer;
    }

    .save-btn:disabled { opacity: 0.6; cursor: not-allowed; }

    .cancel-btn {
        background: none;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 0.4rem 0.8rem;
        font-size: 0.85rem;
        color: #64748b;
        cursor: pointer;
    }

    /* ── Authority section ────────────────────────────────────────────── */

    .authority-section { border-top: 1px solid #e2e8f0; padding-top: 1.5rem; }

    .action-grid {
        display: flex;
        flex-direction: column;
        gap: 0.6rem;
    }

    @media (min-width: 520px) {
        .action-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 0.6rem;
        }
    }

    .action-row {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        padding: 0.7rem 0.9rem;
    }

    .action-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 0.25rem;
    }

    .action-name {
        font-size: 0.78rem;
        font-weight: 600;
        color: #0f172a;
        font-family: monospace;
    }

    .action-desc {
        font-size: 0.78rem;
        color: #64748b;
        line-height: 1.4;
        margin: 0;
    }

    .body-badge {
        font-size: 0.62rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        border-radius: 99px;
        padding: 0.1rem 0.45rem;
        flex-shrink: 0;
    }

    .body-referendum { background: #dbeafe; color: #1d4ed8; }
    .body-assembly   { background: #dcfce7; color: #15803d; }
    .body-council    { background: #fef3c7; color: #d97706; }
    .body-commonwealth { background: #ede9fe; color: #7c3aed; }

    /* ── Amendments ───────────────────────────────────────────────────── */

    .amendment-list {
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
    }

    .amendment-row {
        display: flex;
        gap: 0.75rem;
        align-items: center;
        font-size: 0.8rem;
        padding: 0.4rem 0;
        border-bottom: 1px solid #f1f5f9;
        flex-wrap: wrap;
    }

    .amend-version {
        font-weight: 700;
        color: #15803d;
        min-width: 2rem;
    }

    .amend-key {
        font-family: monospace;
        color: #0f172a;
        font-size: 0.78rem;
    }

    .amend-change { color: #475569; }
    .amend-date   { color: #94a3b8; margin-left: auto; }
</style>
