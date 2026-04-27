<script lang="ts">
    import { currentPage } from "../lib/session.js";
    import { addPerson } from "../lib/api.js";
    import type { PersonDto } from "../lib/api.js";
    import ErrorBanner from "../components/ErrorBanner.svelte";

    let firstName     = $state("");
    let lastName      = $state("");
    let birthDate     = $state("");
    let phone         = $state("");
    let bornIn        = $state(false);

    let error   = $state("");
    let loading = $state(false);
    let created: PersonDto | null = $state(null);

    const suggestedHandle = $derived(
        firstName && lastName
            ? `${firstName.toLowerCase().replace(/[^a-z0-9]/g, "")}_${lastName.toLowerCase().replace(/[^a-z0-9]/g, "")}`
            : ""
    );

    async function submit() {
        error = "";
        if (!firstName.trim()) { error = "First name is required"; return; }
        if (!lastName.trim())  { error = "Last name is required"; return; }
        if (!birthDate)        { error = "Date of birth is required"; return; }

        loading = true;
        try {
            created = await addPerson({
                firstName: firstName.trim(),
                lastName:  lastName.trim(),
                birthDate,
                bornInCommunity: bornIn,
                phone: phone.trim() || null,
            });
        } catch (e) {
            error = e instanceof Error ? e.message : "Failed to add person";
        } finally {
            loading = false;
        }
    }

    function addAnother() {
        firstName = "";
        lastName  = "";
        birthDate = "";
        phone     = "";
        bornIn    = false;
        error     = "";
        created   = null;
    }
</script>

<div class="add-person-page">
    <div class="page-header">
        <button class="back-btn" onclick={() => currentPage.go("directory")}>← Directory</button>
        <h2 class="page-title">Add Person</h2>
    </div>

    {#if created}
        <div class="success-card">
            <div class="success-icon">✓</div>
            <div class="success-name">{created.firstName} {created.lastName}</div>
            <div class="success-handle">@{created.handle}</div>
            <p class="success-note">
                Person added. They can set a password from the directory.
            </p>
            <div class="success-actions">
                <button class="btn-secondary" onclick={addAnother}>Add another</button>
                <button class="btn-primary" onclick={() => currentPage.go("directory")}>Done</button>
            </div>
        </div>

    {:else}
        <ErrorBanner message={error} />

        <form onsubmit={(e) => { e.preventDefault(); submit(); }}>
            <div class="card">
                <div class="row">
                    <label class="field">
                        <span>First name</span>
                        <input
                            type="text"
                            bind:value={firstName}
                            autocomplete="given-name"
                            disabled={loading}
                            placeholder="Jane"
                        />
                    </label>
                    <label class="field">
                        <span>Last name</span>
                        <input
                            type="text"
                            bind:value={lastName}
                            autocomplete="family-name"
                            disabled={loading}
                            placeholder="Smith"
                        />
                    </label>
                </div>

                {#if suggestedHandle}
                    <div class="handle-preview">Handle will be <strong>@{suggestedHandle}</strong></div>
                {/if}

                <label class="field">
                    <span>Date of birth</span>
                    <input type="date" bind:value={birthDate} disabled={loading} />
                </label>

                <label class="field">
                    <span>Phone <span class="optional">(optional)</span></span>
                    <input
                        type="tel"
                        bind:value={phone}
                        autocomplete="tel"
                        disabled={loading}
                        placeholder="+1 555 000 0000"
                    />
                </label>

                <label class="checkbox-field">
                    <input type="checkbox" bind:checked={bornIn} disabled={loading} />
                    <span>Born into community <span class="hint">(receives birth grant instead of join endowment)</span></span>
                </label>
            </div>

            <button type="submit" class="btn-primary btn-full" disabled={loading}>
                {loading ? "Adding…" : "Add person"}
            </button>
        </form>
    {/if}
</div>

<style>
    .add-person-page {
        padding: 1.5rem 1.5rem 6rem;
        max-width: 480px;
        margin: 0 auto;
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
    }

    @media (min-width: 768px) {
        .add-person-page { padding-bottom: 2rem; }
    }

    .page-header {
        display: flex;
        align-items: center;
        gap: 1rem;
    }

    .back-btn {
        background: none;
        border: none;
        color: #16a34a;
        font-size: 0.9rem;
        font-weight: 500;
        cursor: pointer;
        padding: 0;
        white-space: nowrap;
    }

    .page-title {
        font-size: 1.4rem;
        font-weight: 700;
        color: #0f172a;
        margin: 0;
    }

    .card {
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 16px;
        padding: 1.25rem 1.25rem 1.5rem;
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }

    .field { display: flex; flex-direction: column; gap: 0.35rem; }

    .field > span {
        font-size: 0.82rem;
        font-weight: 500;
        color: #374151;
    }

    .optional { color: #94a3b8; font-weight: 400; }

    .field input[type="text"],
    .field input[type="tel"],
    .field input[type="date"] {
        border: 1px solid #cbd5e1;
        border-radius: 10px;
        font-size: 1rem;
        padding: 0.7rem 0.9rem;
        outline: none;
        transition: border-color 0.15s;
        box-sizing: border-box;
        width: 100%;
    }

    .field input:focus { border-color: #16a34a; }
    .field input:disabled { background: #f8fafc; color: #94a3b8; }

    .handle-preview {
        font-size: 0.8rem;
        color: #64748b;
        margin-top: -0.25rem;
    }

    .checkbox-field {
        display: flex;
        align-items: flex-start;
        gap: 0.6rem;
        cursor: pointer;
        font-size: 0.88rem;
        color: #374151;
    }

    .checkbox-field input[type="checkbox"] {
        margin-top: 0.15rem;
        accent-color: #16a34a;
        width: 1rem;
        height: 1rem;
        flex-shrink: 0;
    }

    .hint { color: #94a3b8; font-size: 0.8rem; }

    .btn-primary {
        padding: 0.85rem;
        background: #16a34a;
        color: #fff;
        border: none;
        border-radius: 12px;
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.15s;
    }

    .btn-primary:disabled { background: #86efac; cursor: default; }
    .btn-primary:not(:disabled):active { background: #15803d; }

    .btn-secondary {
        padding: 0.85rem 1.25rem;
        background: #f1f5f9;
        border: none;
        border-radius: 12px;
        font-size: 1rem;
        font-weight: 500;
        cursor: pointer;
        color: #475569;
    }

    .btn-full { width: 100%; }

    /* Success state */
    .success-card {
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 16px;
        padding: 2rem 1.5rem;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
        text-align: center;
    }

    .success-icon {
        width: 3rem;
        height: 3rem;
        border-radius: 50%;
        background: #dcfce7;
        color: #15803d;
        font-size: 1.4rem;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 0.25rem;
    }

    .success-name { font-size: 1.2rem; font-weight: 700; color: #0f172a; }
    .success-handle { font-size: 0.9rem; color: #64748b; }

    .success-note {
        font-size: 0.85rem;
        color: #64748b;
        margin: 0.5rem 0 0.75rem;
        max-width: 280px;
    }

    .success-actions {
        display: flex;
        gap: 0.75rem;
        width: 100%;
        margin-top: 0.5rem;
    }

    .success-actions .btn-primary,
    .success-actions .btn-secondary { flex: 1; }
</style>
