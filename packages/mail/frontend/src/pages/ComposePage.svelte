<script lang="ts">
    import { sendMessage, saveDraft, deleteDraft, getPersons, type PersonDto } from "../lib/api.js";
    import { currentPage, selectedThreadId, selectedDraft } from "../lib/session.js";
    import { randomUUID } from "../lib/uuid.js";

    // Pre-fill from draft if one was selected
    const draft = $selectedDraft;
    let draftId      = $state(draft?.id ?? randomUUID());
    let toHandle     = $state(draft?.toHandles[0] ?? "");
    let toInputValue = $state("");
    let subject      = $state(draft?.subject ?? "");
    let body         = $state(draft?.body ?? "");
    let sending      = $state(false);
    let error        = $state("");
    let savedAt      = $state<string | null>(null);

    let allPersons   = $state<PersonDto[]>([]);
    let suggestions  = $state<PersonDto[]>([]);
    let showDropdown = $state(false);
    let activeIndex  = $state(-1);

    // Clear the selected draft so returning to Compose opens a blank form
    selectedDraft.set(null);

    // Pre-load directory; if draft had a recipient, resolve its display name
    getPersons().then(persons => {
        allPersons = persons;
        if (toHandle) {
            const match = persons.find(p => p.handle === toHandle);
            if (match) toInputValue = `${match.firstName} ${match.lastName} (@${match.handle})`;
            else toInputValue = `@${toHandle}`;
        }
    }).catch(() => {});

    let saveTimer: ReturnType<typeof setTimeout> | null = null;

    function scheduleSave() {
        if (saveTimer) clearTimeout(saveTimer);
        saveTimer = setTimeout(() => autoSave(), 1500);
    }

    async function autoSave() {
        if (!toHandle.trim() && !subject.trim() && !body.trim()) return;
        try {
            await saveDraft(draftId, toHandle.trim() ? [toHandle.trim()] : [], subject, body);
            savedAt = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        } catch { /* non-fatal */ }
    }

    function onToInput(e: Event) {
        const val = (e.target as HTMLInputElement).value;
        toInputValue = val;
        toHandle = "";   // clear until a suggestion is confirmed
        activeIndex = -1;

        if (!val.trim()) {
            suggestions = [];
            showDropdown = false;
            scheduleSave();
            return;
        }

        const q = val.toLowerCase();
        suggestions = allPersons.filter(p =>
            !p.disabled && !p.retired &&
            (`${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
             p.handle.toLowerCase().includes(q))
        ).slice(0, 8);
        showDropdown = suggestions.length > 0;
        scheduleSave();
    }

    function selectPerson(p: PersonDto) {
        toHandle     = p.handle;
        toInputValue = `${p.firstName} ${p.lastName} (@${p.handle})`;
        suggestions  = [];
        showDropdown = false;
        activeIndex  = -1;
        scheduleSave();
    }

    function onToKeydown(e: KeyboardEvent) {
        if (!showDropdown) return;
        if (e.key === "ArrowDown") {
            e.preventDefault();
            activeIndex = Math.min(activeIndex + 1, suggestions.length - 1);
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            activeIndex = Math.max(activeIndex - 1, 0);
        } else if (e.key === "Enter" && activeIndex >= 0) {
            e.preventDefault();
            selectPerson(suggestions[activeIndex]);
        } else if (e.key === "Escape") {
            showDropdown = false;
        }
    }

    function onToBlur() {
        // Small delay so a mousedown on a suggestion fires before blur closes dropdown
        setTimeout(() => { showDropdown = false; }, 150);
    }

    async function send() {
        if (!toHandle.trim() || !body.trim()) return;
        sending = true; error = "";
        try {
            const msg = await sendMessage(toHandle.trim(), subject.trim(), body.trim());
            // Delete draft on successful send
            try { await deleteDraft(draftId); } catch { /* ignore */ }
            selectedThreadId.set(msg.threadId);
            currentPage.go("thread");
        } catch (e) {
            error = e instanceof Error ? e.message : "Failed to send";
        } finally {
            sending = false;
        }
    }

    async function discard() {
        try { await deleteDraft(draftId); } catch { /* ignore */ }
        currentPage.go("inbox");
    }
</script>

<div class="page">
    <div class="page-header">
        <button class="back-btn" onclick={() => currentPage.go("inbox")}>‹ Inbox</button>
    </div>

    <div class="compose-card">
        <div class="compose-title">
            New Message
            {#if savedAt}<span class="saved-hint">Draft saved {savedAt}</span>{/if}
        </div>

        {#if error}
            <div class="error-banner">{error}</div>
        {/if}

        <form class="compose-form" onsubmit={(e) => { e.preventDefault(); send(); }}>
            <div class="field-row">
                <span class="field-label">To</span>
                <div class="to-wrapper">
                    <input
                        class="field-input"
                        type="text"
                        value={toInputValue}
                        oninput={onToInput}
                        onkeydown={onToKeydown}
                        onblur={onToBlur}
                        onfocus={() => { if (suggestions.length) showDropdown = true; }}
                        placeholder="Name or @handle"
                        autocapitalize="none"
                        autocomplete="off"
                        spellcheck={false}
                        disabled={sending}
                        required
                    />
                    {#if showDropdown}
                        <ul class="suggestions" role="listbox">
                            {#each suggestions as person, i}
                                <li
                                    class="suggestion-item"
                                    class:active={i === activeIndex}
                                    role="option"
                                    aria-selected={i === activeIndex}
                                    onmousedown={() => selectPerson(person)}
                                >
                                    <span class="suggestion-name">{person.firstName} {person.lastName}</span>
                                    <span class="suggestion-handle">@{person.handle}</span>
                                </li>
                            {/each}
                        </ul>
                    {/if}
                </div>
            </div>

            <div class="field-divider"></div>

            <div class="field-row">
                <span class="field-label">Subject</span>
                <input
                    class="field-input"
                    type="text"
                    bind:value={subject}
                    oninput={scheduleSave}
                    placeholder="(no subject)"
                    disabled={sending}
                />
            </div>

            <div class="field-divider body-start"></div>

            <textarea
                class="body-input"
                bind:value={body}
                oninput={scheduleSave}
                placeholder="Write your message…"
                rows={12}
                disabled={sending}
                required
            ></textarea>

            <div class="compose-actions">
                <button
                    type="button"
                    class="discard-btn"
                    onclick={discard}
                    disabled={sending}
                >Discard</button>
                <button
                    class="send-btn"
                    type="submit"
                    disabled={sending || !toHandle.trim() || !body.trim()}
                >
                    {sending ? "Sending…" : "Send"}
                </button>
            </div>
        </form>
    </div>
</div>

<style>
    .page {
        max-width: 760px;
        margin: 0 auto;
        padding: 0 0 4rem;
    }

    .page-header {
        padding: 1.25rem 1.5rem 1rem;
        border-bottom: 1px solid #e2e8f0;
    }

    .back-btn {
        background: none;
        border: none;
        font-size: 0.8rem;
        color: #16a34a;
        cursor: pointer;
        padding: 0;
        font-weight: 600;
        font-family: inherit;
    }

    .compose-card {
        margin: 1.25rem 1.5rem;
        border: 1px solid #e2e8f0;
        border-radius: 0.75rem;
        background: #fff;
        overflow: hidden;
    }

    .compose-title {
        padding: 0.875rem 1.25rem;
        font-size: 0.95rem;
        font-weight: 700;
        color: #0f172a;
        background: #f8fafc;
        border-bottom: 1px solid #e2e8f0;
    }

    .error-banner {
        background: #fee2e2;
        color: #991b1b;
        padding: 0.75rem 1.25rem;
        font-size: 0.875rem;
        border-bottom: 1px solid #fecaca;
    }

    .compose-form {
        display: flex;
        flex-direction: column;
    }

    .field-row {
        display: flex;
        align-items: center;
        padding: 0.7rem 1.25rem;
        gap: 0.75rem;
    }

    .field-label {
        font-size: 0.8rem;
        font-weight: 600;
        color: #64748b;
        width: 4.5rem;
        flex-shrink: 0;
    }

    .field-input {
        flex: 1;
        border: none;
        outline: none;
        font-size: 0.9rem;
        font-family: inherit;
        color: #0f172a;
        background: transparent;
        padding: 0;
        width: 100%;
    }
    .field-input::placeholder { color: #cbd5e1; }

    .to-wrapper {
        flex: 1;
        position: relative;
    }

    .suggestions {
        position: absolute;
        top: calc(100% + 6px);
        left: -4.5rem; /* align with left edge of field-row */
        right: -1.25rem;
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 0.5rem;
        box-shadow: 0 4px 16px rgba(0,0,0,0.08);
        list-style: none;
        margin: 0;
        padding: 0.25rem 0;
        z-index: 100;
        max-height: 260px;
        overflow-y: auto;
    }

    .suggestion-item {
        display: flex;
        align-items: baseline;
        gap: 0.5rem;
        padding: 0.5rem 1rem;
        cursor: pointer;
        font-size: 0.875rem;
    }
    .suggestion-item:hover,
    .suggestion-item.active { background: #f0fdf4; }

    .suggestion-name {
        color: #0f172a;
        font-weight: 500;
    }

    .suggestion-handle {
        color: #64748b;
        font-size: 0.8rem;
    }

    .field-divider {
        height: 1px;
        background: #f1f5f9;
        margin: 0 1.25rem;
    }
    .field-divider.body-start { margin: 0; }

    .body-input {
        resize: none;
        border: none;
        outline: none;
        font-size: 0.9rem;
        font-family: inherit;
        color: #0f172a;
        background: transparent;
        padding: 1rem 1.25rem;
        line-height: 1.7;
        min-height: 14rem;
    }
    .body-input::placeholder { color: #cbd5e1; }

    .compose-actions {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 0.75rem;
        padding: 0.75rem 1.25rem;
        border-top: 1px solid #f1f5f9;
        background: #fafafa;
    }

    .discard-btn {
        background: none;
        border: 1px solid #e2e8f0;
        color: #64748b;
        padding: 0.5rem 1rem;
        border-radius: 0.5rem;
        font-size: 0.875rem;
        font-family: inherit;
        cursor: pointer;
        transition: background 0.1s;
    }
    .discard-btn:hover:not(:disabled) { background: #f1f5f9; }

    .send-btn {
        padding: 0.5rem 1.5rem;
        background: #16a34a;
        color: #fff;
        border: none;
        border-radius: 0.5rem;
        font-size: 0.875rem;
        font-weight: 600;
        cursor: pointer;
        font-family: inherit;
        transition: background 0.15s;
    }
    .send-btn:hover:not(:disabled) { background: #15803d; }
    .send-btn:disabled { background: #86efac; cursor: default; }

    .saved-hint {
        font-size: 0.75rem;
        font-weight: 400;
        color: #94a3b8;
        margin-left: 0.75rem;
    }
</style>

