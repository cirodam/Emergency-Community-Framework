<script lang="ts">
    import { submitPublicApplication, type ApplicationDto } from "../lib/api.js";

    const { onBack }: { onBack: () => void } = $props();

    // ── Form state ─────────────────────────────────────────────────────────────
    let firstName = $state("");
    let lastName  = $state("");
    let birthDate = $state("");
    let message   = $state("");
    let submitting = $state(false);
    let error      = $state("");
    let submitted: ApplicationDto | null = $state(null);
    let agreed     = $state(false);

    // ── Submit ─────────────────────────────────────────────────────────────────
    async function submit() {
        error = "";
        if (!agreed)            { error = "Please read and acknowledge the community agreement"; return; }
        if (!firstName.trim())  { error = "First name is required"; return; }
        if (!lastName.trim())   { error = "Last name is required"; return; }
        if (!birthDate)         { error = "Date of birth is required"; return; }
        if (!message.trim())    { error = "Introduction is required"; return; }

        submitting = true;
        try {
            submitted = await submitPublicApplication({
                firstName: firstName.trim(),
                lastName:  lastName.trim(),
                birthDate,
                message:   message.trim(),
            });
        } catch (e) {
            error = e instanceof Error ? e.message : "Failed to submit application";
        } finally {
            submitting = false;
        }
    }
</script>

<div class="apply-page">
    <header class="apply-header">
        <div class="logo">⊚</div>
        <h1>Apply for Membership</h1>
        <p>Submit your application to join this community.</p>
    </header>

    {#if submitted}
        <div class="apply-body success-card">
            <div class="success-icon">✓</div>
            <h2>Application submitted!</h2>
            <p>
                Thank you, <strong>{submitted.firstName}</strong>. Your application has been received and is now visible to community members.
            </p>
            <div class="what-next">
                <h3>What happens next</h3>
                <ol>
                    <li>Community members will review your application.</li>
                    <li>You need <strong>{submitted.vouchesRequired}</strong> members to vouch for you.</li>
                    <li>Once you have enough vouches you will be automatically admitted and receive a community account.</li>
                </ol>
            </div>
            <p class="app-ref">Application ID: <code>{submitted.id}</code></p>
            <button class="btn-ghost" onclick={onBack}>← Back to sign in</button>
        </div>
    {:else}
        <div class="apply-body">
            <div class="community-agreement">
                <h3>Before you apply</h3>
                <p>
                    This is a <strong>mutual aid community</strong> — not a bank, not a business, not a ladder to climb.
                    It runs on cooperation and trust. Here's what that means in practice:
                </p>
                <ul>
                    <li>Give what you can. Take what you need. Neither will be tracked with a ledger of guilt.</li>
                    <li>This works because people show up for each other — not because of rules or incentives.</li>
                    <li>You will not get rich here. There are no investment returns, no passive income, no hustle.</li>
                    <li>You can leave at any time, no questions asked.</li>
                    <li>Membership is granted by your neighbors vouching for you — and your word that you'll do the same for others.</li>
                </ul>
                <label class="agree-row">
                    <input
                        type="checkbox"
                        bind:checked={agreed}
                        disabled={submitting}
                    />
                    <span>I understand what this community is and I want to be part of it.</span>
                </label>
            </div>

            <form onsubmit={(e) => { e.preventDefault(); submit(); }}>
                <div class="field-row">
                    <label class="field">
                        <span>First name</span>
                        <input
                            type="text"
                            bind:value={firstName}
                            placeholder="First name"
                            autocomplete="given-name"
                            disabled={submitting}
                        />
                    </label>
                    <label class="field">
                        <span>Last name</span>
                        <input
                            type="text"
                            bind:value={lastName}
                            placeholder="Last name"
                            autocomplete="family-name"
                            disabled={submitting}
                        />
                    </label>
                </div>

                <label class="field">
                    <span>Date of birth</span>
                    <input
                        type="date"
                        bind:value={birthDate}
                        disabled={submitting}
                    />
                </label>

                <label class="field">
                    <span>Introduction</span>
                    <textarea
                        bind:value={message}
                        rows="4"
                        placeholder="Tell the community about yourself and why you want to join…"
                        disabled={submitting}
                    ></textarea>
                </label>

                {#if error}
                    <p class="form-error">{error}</p>
                {/if}

                <button
                    type="submit"
                    class="btn-primary"
                    disabled={submitting || !agreed || !firstName.trim() || !lastName.trim() || !birthDate || !message.trim()}
                >
                    {submitting ? "Submitting…" : "Submit Application"}
                </button>
            </form>

            <p class="back-link">
                Already a member? <button class="link-btn" onclick={onBack}>Sign in</button>
            </p>
        </div>
    {/if}
</div>

<style>
    .apply-page {
        min-height: 100dvh;
        display: flex;
        flex-direction: column;
        align-items: center;
        background: #f0fdf4;
        padding: 0 1.5rem 3rem;
    }

    .apply-header {
        text-align: center;
        padding: 3rem 0 1.5rem;
    }

    .logo {
        font-size: 3rem;
        line-height: 1;
        margin-bottom: 0.75rem;
        color: #16a34a;
    }

    h1 {
        font-size: 1.6rem;
        font-weight: 700;
        color: #0f172a;
        margin: 0 0 0.5rem;
    }

    .apply-header p {
        color: #64748b;
        margin: 0;
    }

    .apply-body {
        width: 100%;
        max-width: 480px;
        background: #fff;
        border-radius: 1rem;
        padding: 1.75rem;
        box-shadow: 0 2px 12px rgba(0,0,0,0.07);
    }

    /* ── Community agreement ── */
    .community-agreement {
        background: #fffbeb;
        border: 1px solid #fcd34d;
        border-radius: 0.75rem;
        padding: 1.25rem 1.25rem 1rem;
        margin-bottom: 1.5rem;
    }

    .community-agreement h3 {
        margin: 0 0 0.6rem;
        font-size: 0.95rem;
        font-weight: 700;
        color: #92400e;
    }

    .community-agreement > p {
        margin: 0 0 0.75rem;
        font-size: 0.9rem;
        color: #78350f;
        line-height: 1.55;
    }

    .community-agreement ul {
        margin: 0 0 1rem;
        padding-left: 1.25rem;
        color: #374151;
        font-size: 0.9rem;
        line-height: 1.75;
    }

    .community-agreement ul li {
        margin-bottom: 0.15rem;
    }

    .agree-row {
        display: flex;
        align-items: flex-start;
        gap: 0.6rem;
        cursor: pointer;
        font-size: 0.9rem;
        font-weight: 600;
        color: #0f172a;
        background: #fff7ed;
        border: 1px solid #fed7aa;
        border-radius: 0.5rem;
        padding: 0.65rem 0.85rem;
    }

    .agree-row input[type="checkbox"] {
        width: 1.1rem;
        height: 1.1rem;
        flex-shrink: 0;
        margin-top: 0.1rem;
        accent-color: #16a34a;
        cursor: pointer;
    }

    .field-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.75rem;
    }

    .field {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
        margin-bottom: 1rem;
    }

    .field span {
        font-size: 0.85rem;
        font-weight: 500;
        color: #374151;
    }

    .field input,
    .field textarea {
        padding: 0.6rem 0.75rem;
        border: 1.5px solid #d1d5db;
        border-radius: 0.5rem;
        font-size: 0.95rem;
        font-family: inherit;
        background: #fff;
        transition: border-color 0.15s;
        width: 100%;
        box-sizing: border-box;
    }

    .field input:focus,
    .field textarea:focus {
        outline: none;
        border-color: #16a34a;
    }

    .field textarea {
        resize: vertical;
    }

    .form-error {
        color: #dc2626;
        font-size: 0.85rem;
        margin: 0 0 0.75rem;
    }

    .btn-primary {
        width: 100%;
        padding: 0.75rem;
        background: #16a34a;
        color: #fff;
        border: none;
        border-radius: 0.5rem;
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.15s;
    }

    .btn-primary:hover:not(:disabled) { background: #15803d; }
    .btn-primary:disabled { opacity: 0.55; cursor: not-allowed; }

    .back-link {
        text-align: center;
        margin: 1.25rem 0 0;
        font-size: 0.9rem;
        color: #64748b;
    }

    .link-btn {
        background: none;
        border: none;
        color: #16a34a;
        font-size: inherit;
        cursor: pointer;
        padding: 0;
        font-weight: 500;
        text-decoration: underline;
    }

    /* ── Success card ── */
    .success-card {
        text-align: center;
    }

    .success-icon {
        font-size: 3rem;
        color: #16a34a;
        margin-bottom: 0.5rem;
    }

    .success-card h2 {
        margin: 0 0 0.75rem;
        font-size: 1.4rem;
        color: #0f172a;
    }

    .success-card p {
        color: #374151;
        margin: 0 0 1rem;
        line-height: 1.6;
    }

    .what-next {
        text-align: left;
        background: #f0fdf4;
        border: 1px solid #bbf7d0;
        border-radius: 0.75rem;
        padding: 1rem 1.25rem;
        margin: 1rem 0;
    }

    .what-next h3 {
        margin: 0 0 0.5rem;
        font-size: 0.85rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: #166534;
    }

    .what-next ol {
        margin: 0;
        padding-left: 1.25rem;
        color: #374151;
        font-size: 0.92rem;
        line-height: 1.7;
    }

    .app-ref {
        font-size: 0.8rem;
        color: #94a3b8;
        margin: 0.5rem 0 1.25rem;
    }

    .app-ref code {
        font-family: monospace;
        background: #f1f5f9;
        padding: 0.1em 0.35em;
        border-radius: 0.25rem;
    }

    .btn-ghost {
        background: none;
        border: 1.5px solid #d1d5db;
        border-radius: 0.5rem;
        padding: 0.55rem 1.25rem;
        font-size: 0.9rem;
        cursor: pointer;
        color: #374151;
        font-weight: 500;
    }

    .btn-ghost:hover { background: #f1f5f9; }
</style>
