<script lang="ts">
    import { getBylaw, updateBylawSection, addBylawArticle, addBylawSection } from "../lib/api.js";
    import type { BylawDto, DocumentSection } from "../lib/api.js";
    import { currentPage, session, selectedBylawId } from "../lib/session.js";
    import { formatDate } from "../lib/utils.js";

    const bylawId = $derived($selectedBylawId ?? "");
    const isSteward = $derived($session?.isSteward ?? false);

    let doc: BylawDto | null = $state(null);
    let loading = $state(true);
    let error   = $state("");

    $effect(() => {
        if (!bylawId) return;
        loading = true; error = "";
        getBylaw(bylawId)
            .then(d  => { doc = d; })
            .catch(e => { error = e instanceof Error ? e.message : "Failed to load bylaw"; })
            .finally(() => { loading = false; });
    });

    // ── Section editing ───────────────────────────────────────────────────────
    let editingSectionId  = $state<string | null>(null);
    let editSectionBody   = $state("");
    let sectionSaving     = $state(false);
    let sectionSaveError  = $state("");

    function startEditSection(section: DocumentSection) {
        editSectionBody = section.body;
        sectionSaveError = "";
        editingSectionId = section.id;
    }

    async function saveSection() {
        if (!doc || !editingSectionId) return;
        sectionSaving = true; sectionSaveError = "";
        try {
            doc = await updateBylawSection(doc.id, editingSectionId, editSectionBody);
            editingSectionId = null;
        } catch (e) {
            sectionSaveError = e instanceof Error ? e.message : "Failed to save";
        } finally {
            sectionSaving = false;
        }
    }

    // ── Add article form ──────────────────────────────────────────────────────
    let showAddArticle   = $state(false);
    let addArticleNum    = $state("");
    let addArticleTitle  = $state("");
    let addArticlePre    = $state("");
    let addingArticle    = $state(false);
    let addArticleError  = $state("");

    async function submitArticle() {
        addArticleError = "";
        if (!addArticleNum.trim() || !addArticleTitle.trim()) { addArticleError = "Number and title are required."; return; }
        addingArticle = true;
        try {
            doc = await addBylawArticle(bylawId, addArticleNum.trim(), addArticleTitle.trim(), addArticlePre.trim() || undefined);
            showAddArticle = false; addArticleNum = ""; addArticleTitle = ""; addArticlePre = "";
        } catch (e) {
            addArticleError = e instanceof Error ? e.message : "Failed to add article";
        } finally {
            addingArticle = false;
        }
    }

    // ── Add section form ──────────────────────────────────────────────────────
    let addingSectionForArticle = $state<string | null>(null); // article number
    let addSectionId    = $state("");
    let addSectionTitle = $state("");
    let addSectionBody  = $state("");
    let addingSection   = $state(false);
    let addSectionError = $state("");

    function startAddSection(articleNumber: string) {
        addingSectionForArticle = articleNumber;
        addSectionId = ""; addSectionTitle = ""; addSectionBody = ""; addSectionError = "";
    }

    async function submitSection() {
        addSectionError = "";
        if (!addSectionId.trim() || !addSectionBody.trim()) { addSectionError = "Section ID and body are required."; return; }
        addingSection = true;
        try {
            doc = await addBylawSection(bylawId, addingSectionForArticle!, addSectionId.trim(), addSectionTitle.trim(), addSectionBody.trim());
            addingSectionForArticle = null;
        } catch (e) {
            addSectionError = e instanceof Error ? e.message : "Failed to add section";
        } finally {
            addingSection = false;
        }
    }

</script>

<div class="bylaw-page doc-viewer">
    <div class="page-header">
        <button class="back-btn" onclick={() => currentPage.go("documents")}>‹ Documents</button>
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
            </div>
            <h1 class="doc-title">{doc.title}</h1>
            {#if doc.preamble}
                <p class="doc-preamble">{doc.preamble}</p>
            {/if}
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
                            <div class="section-edit-area">
                                <textarea
                                    class="section-textarea"
                                    rows={6}
                                    bind:value={editSectionBody}
                                    disabled={sectionSaving}
                                ></textarea>
                                {#if sectionSaveError}
                                    <p class="edit-error">{sectionSaveError}</p>
                                {/if}
                                <div class="edit-actions">
                                    <button class="save-btn" onclick={saveSection} disabled={sectionSaving}>
                                        {sectionSaving ? "Saving…" : "Save"}
                                    </button>
                                    <button class="cancel-btn" onclick={() => editingSectionId = null} disabled={sectionSaving}>Cancel</button>
                                </div>
                            </div>
                        {:else}
                            <p class="section-body">{section.body}</p>
                            {#if isSteward}
                                <button class="edit-link" onclick={() => startEditSection(section)}>Edit</button>
                            {/if}
                        {/if}
                    </div>
                {/each}

                <!-- Add section to this article -->
                {#if isSteward}
                    {#if addingSectionForArticle === article.number}
                        <div class="add-form">
                            <div class="add-form-title">Add Section to Article {article.number}</div>
                            <label class="field">
                                <span>Section ID <small>(e.g. {article.number}.1)</small></span>
                                <input type="text" bind:value={addSectionId} placeholder="{article.number}.1" disabled={addingSection} />
                            </label>
                            <label class="field">
                                <span>Title <small>(optional)</small></span>
                                <input type="text" bind:value={addSectionTitle} disabled={addingSection} />
                            </label>
                            <label class="field">
                                <span>Body</span>
                                <textarea rows={4} bind:value={addSectionBody} disabled={addingSection}></textarea>
                            </label>
                            {#if addSectionError}<p class="field-error">{addSectionError}</p>{/if}
                            <div class="edit-actions">
                                <button class="save-btn" onclick={submitSection} disabled={addingSection || !addSectionId.trim() || !addSectionBody.trim()}>
                                    {addingSection ? "Adding…" : "Add Section"}
                                </button>
                                <button class="cancel-btn" onclick={() => addingSectionForArticle = null} disabled={addingSection}>Cancel</button>
                            </div>
                        </div>
                    {:else}
                        <button class="add-link" onclick={() => startAddSection(article.number)}>+ Add Section</button>
                    {/if}
                {/if}
            </section>
        {/each}

        <!-- Add article -->
        {#if isSteward}
            {#if showAddArticle}
                <div class="add-form">
                    <div class="add-form-title">Add Article</div>
                    <label class="field">
                        <span>Article number <small>(e.g. I, II, III)</small></span>
                        <input type="text" bind:value={addArticleNum} placeholder="I" disabled={addingArticle} />
                    </label>
                    <label class="field">
                        <span>Title</span>
                        <input type="text" bind:value={addArticleTitle} disabled={addingArticle} />
                    </label>
                    <label class="field">
                        <span>Preamble <small>(optional)</small></span>
                        <textarea rows={2} bind:value={addArticlePre} disabled={addingArticle}></textarea>
                    </label>
                    {#if addArticleError}<p class="field-error">{addArticleError}</p>{/if}
                    <div class="edit-actions">
                        <button class="save-btn" onclick={submitArticle} disabled={addingArticle || !addArticleNum.trim() || !addArticleTitle.trim()}>
                            {addingArticle ? "Adding…" : "Add Article"}
                        </button>
                        <button class="cancel-btn" onclick={() => showAddArticle = false} disabled={addingArticle}>Cancel</button>
                    </div>
                </div>
            {:else}
                <button class="add-link" onclick={() => showAddArticle = true}>+ Add Article</button>
            {/if}
        {:else if doc.articles.length === 0}
            <p class="empty-state">No articles have been added to this bylaw yet.</p>
        {/if}

    {/if}
</div>

<style>
    .bylaw-page {
        padding: 1rem 1.5rem 6rem;
        max-width: 720px;
        margin: 0 auto;
    }

    @media (min-width: 768px) {
        .bylaw-page { padding-bottom: 2rem; }
    }

    .page-header { margin-bottom: 0.5rem; }

    .back-btn {
        background: none;
        border: none;
        cursor: pointer;
        font-size: 0.9rem;
        color: #16a34a;
        padding: 0.25rem 0;
        font-weight: 500;
    }
    .back-btn:hover { text-decoration: underline; }

    .doc-header { margin-bottom: 2rem; }

    /* .doc-meta-row / .doc-meta-sep — shared in app.css under .doc-viewer */
    .doc-meta-label { font-size: 0.8rem; color: #94a3b8; }

    .doc-title { font-size: 1.6rem; font-weight: 800; color: #0f172a; margin: 0 0 0.75rem; }
    .doc-preamble { font-size: 0.95rem; color: #475569; line-height: 1.7; font-style: italic; margin: 0; }

    /* Articles */
    .article {
        margin-bottom: 2.5rem;
        border-left: 3px solid #dcfce7;
        padding-left: 1.25rem;
    }

    .article-heading {
        font-size: 1.1rem;
        font-weight: 700;
        color: #0f172a;
        margin: 0 0 0.5rem;
    }

    .article-number {
        display: block;
        font-size: 0.7rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: #16a34a;
        margin-bottom: 0.15rem;
    }

    .article-preamble { font-size: 0.9rem; color: #64748b; font-style: italic; margin: 0 0 1rem; line-height: 1.6; }

    /* Sections */
    .doc-section { margin-bottom: 1.25rem; }

    .section-heading {
        font-size: 0.95rem;
        font-weight: 600;
        color: #0f172a;
        margin: 0 0 0.35rem;
    }

    .section-id {
        font-size: 0.75rem;
        color: #94a3b8;
        font-weight: 500;
        margin-right: 0.4rem;
    }

    .section-body {
        font-size: 0.95rem;
        color: #334155;
        line-height: 1.75;
        margin: 0 0 0.25rem;
        white-space: pre-wrap;
    }

    .edit-link, .add-link {
        background: none;
        border: none;
        cursor: pointer;
        font-size: 0.78rem;
        color: #16a34a;
        padding: 0;
        font-weight: 500;
        display: inline-block;
        margin-top: 0.1rem;
    }
    .edit-link:hover, .add-link:hover { text-decoration: underline; }

    .add-link { margin-top: 0.75rem; display: block; }

    /* Edit / add forms */
    .section-edit-area,
    .add-form {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        padding: 1rem;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        margin-top: 0.5rem;
    }

    .add-form-title { font-size: 0.85rem; font-weight: 600; color: #374151; }

    .section-textarea {
        width: 100%;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        font-size: 0.9rem;
        padding: 0.65rem 0.85rem;
        resize: vertical;
        font-family: inherit;
        outline: none;
        line-height: 1.6;
        box-sizing: border-box;
    }
    .section-textarea:focus { border-color: #16a34a; }

    .field { display: flex; flex-direction: column; gap: 0.3rem; }
    .field span { font-size: 0.82rem; font-weight: 500; color: #374151; }
    .field small { font-weight: 400; opacity: 0.6; }
    .field input, .field textarea {
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        font-size: 0.9rem;
        padding: 0.55rem 0.8rem;
        outline: none;
        resize: vertical;
        font-family: inherit;
        transition: border-color 0.15s;
    }
    .field input:focus, .field textarea:focus { border-color: #16a34a; }

    .field-error { font-size: 0.8rem; color: #dc2626; margin: 0; }

    /* .edit-error / .edit-actions / .save-btn / .cancel-btn — shared in app.css under .doc-viewer */

    .state-msg { padding: 3rem 0; text-align: center; color: #94a3b8; }
    .state-msg.error { color: #dc2626; }
    .empty-state { color: #94a3b8; font-size: 0.9rem; padding: 1rem 0; }
</style>
