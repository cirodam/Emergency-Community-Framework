<script lang="ts">
    import ErrorBanner from "../components/ErrorBanner.svelte";
    import { runSetup } from "../lib/api.js";

    interface Props { onComplete: () => void; }
    let { onComplete }: Props = $props();

    // Step 1 = community info, Step 2 = founder info, Step 3 = done
    let step = $state(1);

    let communityName   = $state("");
    let communityHandle = $state("");
    let firstName     = $state("");
    let lastName      = $state("");
    let birthDate     = $state("");
    let handle        = $state("");
    let password      = $state("");
    let confirm       = $state("");
    let phone         = $state("");
    let seedPopulation = $state(false);

    let error   = $state("");
    let loading = $state(false);
    let seededCount = $state(0);

    // Auto-generate community handle from community name
    const suggestedCommunityHandle = $derived(
        communityName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    );

    $effect(() => {
        if (!communityHandle && suggestedCommunityHandle) {
            communityHandle = suggestedCommunityHandle;
        }
    });

    // Auto-generate handle suggestion from name
    const suggestedHandle = $derived(
        `${firstName.toLowerCase().replace(/[^a-z0-9]/g, "")}_${lastName.toLowerCase().replace(/[^a-z0-9]/g, "")}`
    );

    $effect(() => {
        if (step === 2 && !handle && suggestedHandle !== "_") {
            handle = suggestedHandle;
        }
    });

    function nextStep() {
        error = "";
        if (step === 1) {
            if (!communityName.trim())   { error = "Enter a community name"; return; }
            if (!communityHandle.trim()) { error = "Enter a community handle"; return; }
            step = 2;
        }
    }

    async function submit() {
        error = "";
        if (!firstName.trim())  { error = "First name is required"; return; }
        if (!lastName.trim())   { error = "Last name is required"; return; }
        if (!birthDate)         { error = "Birth date is required"; return; }
        if (!handle.trim())     { error = "Handle is required"; return; }
        if (password.length < 8) { error = "Password must be at least 8 characters"; return; }
        if (password !== confirm) { error = "Passwords do not match"; return; }

        loading = true;
        try {
            const result = await runSetup({ communityName, communityHandle, firstName, lastName, birthDate, handle, password, phone: phone.trim() || undefined, seedPopulation });
            seededCount = result.seededCount ?? 0;
            step = 3;
        } catch (e) {
            error = e instanceof Error ? e.message : "Setup failed";
        } finally {
            loading = false;
        }
    }
</script>

<div class="setup-page">
    <div class="setup-card">
        <div class="logo">⊚</div>

        {#if step === 1}
            <h1>Welcome to ECF</h1>
            <p class="subtitle">Let's set up your community.</p>

            <ErrorBanner message={error} />

            <form onsubmit={(e) => { e.preventDefault(); nextStep(); }}>
                <label class="field">
                    <span>Community name</span>
                    <input
                        type="text"
                        bind:value={communityName}
                        placeholder="e.g. Sunridge Community"
                        autocomplete="off"
                    />
                </label>

                <label class="field">
                    <span>Community handle</span>
                    <input
                        type="text"
                        bind:value={communityHandle}
                        placeholder="e.g. sunridge-community"
                        autocomplete="off"
                        autocapitalize="none"
                        spellcheck={false}
                    />
                    <span class="hint">Lowercase letters, numbers, and hyphens</span>
                </label>

                <label class="seed-checkbox">
                    <input type="checkbox" bind:checked={seedPopulation} />
                    <span>Seed sample population <span class="seed-hint">(adds ~250 test people)</span></span>
                </label>

                <button type="submit" class="btn-primary">Continue →</button>
            </form>

        {:else if step === 2}
            <h1>{communityName}</h1>
            <p class="subtitle">Create the first member account.</p>

            <ErrorBanner message={error} />

            <form onsubmit={(e) => { e.preventDefault(); submit(); }}>
                <div class="row">
                    <label class="field">
                        <span>First name</span>
                        <input type="text" bind:value={firstName} autocomplete="given-name" disabled={loading} />
                    </label>
                    <label class="field">
                        <span>Last name</span>
                        <input type="text" bind:value={lastName} autocomplete="family-name" disabled={loading} />
                    </label>
                </div>

                <label class="field">
                    <span>Date of birth</span>
                    <input type="date" bind:value={birthDate} disabled={loading} />
                </label>

                <label class="field">
                    <span>Handle</span>
                    <div class="handle-input">
                        <input
                            type="text"
                            bind:value={handle}
                            autocomplete="username"
                            autocapitalize="none"
                            spellcheck={false}
                            disabled={loading}
                        />
                    </div>
                    <span class="hint">Lowercase letters, numbers, underscores</span>
                </label>

                <label class="field">
                    <span>Phone number <span class="optional">(optional — for SMS banking)</span></span>
                    <input
                        type="tel"
                        bind:value={phone}
                        placeholder="+1 404 555 0100"
                        autocomplete="tel"
                        disabled={loading}
                    />
                </label>

                <label class="field">
                    <span>Password</span>
                    <input type="password" bind:value={password} autocomplete="new-password" disabled={loading} />
                </label>

                <label class="field">
                    <span>Confirm password</span>
                    <input type="password" bind:value={confirm} autocomplete="new-password" disabled={loading} />
                </label>

                <div class="btn-row">
                    <button type="button" class="btn-secondary" onclick={() => { step = 1; error = ""; }} disabled={loading}>
                        ← Back
                    </button>
                    <button type="submit" class="btn-primary" disabled={loading}>
                        {loading ? (seedPopulation ? "Seeding population…" : "Setting up…") : "Create community"}
                    </button>
                </div>
            </form>

        {:else}
            <div class="done">
                <div class="done-icon">✓</div>
                <h2>{communityName} is ready</h2>
                <p>Welcome, {firstName}. Sign in to get started.</p>
                {#if seededCount > 0}
                    <p class="seeded-note">{seededCount} sample people added to the community.</p>
                {/if}
                <button class="btn-primary" onclick={onComplete}>Go to sign in</button>
            </div>
        {/if}
    </div>

    <div class="steps">
        <span class="step" class:active={step === 1} class:done={step > 1}>1</span>
        <span class="connector"></span>
        <span class="step" class:active={step === 2} class:done={step > 2}>2</span>
        <span class="connector"></span>
        <span class="step" class:active={step === 3} class:done={step > 3}>✓</span>
    </div>
</div>

<style>
    .setup-page {
        min-height: 100dvh;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background: #f0fdf4;
        padding: 2rem 1.5rem;
        gap: 1.5rem;
    }

    .setup-card {
        width: 100%;
        max-width: 420px;
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 20px;
        padding: 2rem 2rem 2.5rem;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
    }

    .logo { font-size: 2.5rem; margin-bottom: 0.25rem; }

    h1 {
        font-size: 1.5rem;
        font-weight: 700;
        color: #14532d;
        margin: 0;
        text-align: center;
    }

    .subtitle {
        color: #64748b;
        font-size: 0.95rem;
        margin: 0 0 1rem;
        text-align: center;
    }

    form {
        width: 100%;
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }

    .field { display: flex; flex-direction: column; gap: 0.35rem; }

    .field > span { font-size: 0.82rem; font-weight: 500; color: #374151; }

    .hint { font-size: 0.75rem; color: #94a3b8; margin-top: 0.1rem; }
    .optional { font-weight: 400; color: #94a3b8; }

    .field input[type="text"],
    .field input[type="password"],
    .field input[type="date"],
    .field input[type="tel"] {
        border: 1px solid #cbd5e1;
        border-radius: 10px;
        font-size: 1rem;
        padding: 0.7rem 0.9rem;
        outline: none;
        transition: border-color 0.15s;
        width: 100%;
        box-sizing: border-box;
    }

    .field input:focus { border-color: #16a34a; }

    .handle-input {
        display: flex;
        align-items: center;
        border: 1px solid #cbd5e1;
        border-radius: 10px;
        overflow: hidden;
        background: #fff;
        transition: border-color 0.15s;
    }

    .handle-input:focus-within { border-color: #16a34a; }


    .handle-input input {
        border: none !important;
        outline: none;
        font-size: 1rem;
        padding: 0.7rem 0.9rem 0.7rem 0;
        flex: 1;
        background: transparent;
    }

    .btn-row { display: flex; gap: 0.75rem; margin-top: 0.25rem; }

    .btn-primary {
        flex: 1;
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

    .btn-secondary:disabled { opacity: 0.5; cursor: default; }

    /* Done state */
    .done {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.75rem;
        padding: 1rem 0;
        text-align: center;
        width: 100%;
    }

    .done-icon {
        width: 4rem;
        height: 4rem;
        border-radius: 50%;
        background: #dcfce7;
        color: #16a34a;
        font-size: 1.8rem;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .done h2 { margin: 0; font-size: 1.2rem; color: #14532d; }
    .done p  { margin: 0; color: #64748b; }
    .done .btn-primary { width: 100%; }

    .seeded-note {
        font-size: 0.82rem;
        color: #16a34a;
        background: #f0fdf4;
        border: 1px solid #bbf7d0;
        border-radius: 8px;
        padding: 0.4rem 0.75rem;
        margin: 0;
        text-align: center;
        width: 100%;
    }

    .seed-checkbox {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        cursor: pointer;
        font-size: 0.88rem;
        color: #475569;
        padding: 0.25rem 0;
    }

    .seed-checkbox input[type="checkbox"] {
        width: 1rem;
        height: 1rem;
        accent-color: #16a34a;
        cursor: pointer;
        flex-shrink: 0;
    }

    .seed-hint {
        color: #94a3b8;
        font-size: 0.8rem;
    }

    /* Step indicator */
    .steps {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .step {
        width: 2rem;
        height: 2rem;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.8rem;
        font-weight: 600;
        background: #e2e8f0;
        color: #94a3b8;
        transition: background 0.2s, color 0.2s;
    }

    .step.active { background: #16a34a; color: #fff; }
    .step.done   { background: #dcfce7; color: #16a34a; }

    .connector {
        width: 2rem;
        height: 2px;
        background: #e2e8f0;
        border-radius: 1px;
    }
</style>
