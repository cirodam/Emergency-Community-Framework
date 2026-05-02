<script lang="ts">
    import ErrorBanner from "../components/ErrorBanner.svelte";
    import { session, currentPage } from "../lib/session.js";
    import { login } from "../lib/api.js";

    const { onApply }: { onApply?: () => void } = $props();

    let handle   = $state("");
    let password = $state("");
    let error    = $state("");
    let loading  = $state(false);

    // Other ECF services redirect here with ?return=<origin> after which we
    // hand the credential back via a hash fragment so it never hits a server.
    const returnUrl = new URLSearchParams(window.location.search).get("return");

    async function submit() {
        error = "";
        if (!handle.trim())   { error = "Enter your handle"; return; }
        if (!password)        { error = "Enter your password"; return; }

        loading = true;
        try {
            const person = await login(handle.trim().toLowerCase(), password);

            if (returnUrl && (returnUrl.startsWith("http://") || returnUrl.startsWith("https://"))) {
                // Hand the session payload back to the requesting service via
                // the URL fragment (never sent to the server).
                // Encode as encodeURIComponent→btoa so non-ASCII names (accented
                // characters etc.) survive the base64 round-trip safely.
                const payload = btoa(encodeURIComponent(JSON.stringify({
                    token:     person.token,
                    id:        person.id,
                    firstName: person.firstName,
                    lastName:  person.lastName,
                    handle:    person.handle,
                })));
                window.location.href = `${returnUrl}#session=${payload}`;
            } else {
                session.login(person);
                currentPage.go("profile");
            }
        } catch (e) {
            error = e instanceof Error ? e.message : "Login failed";
        } finally {
            loading = false;
        }
    }
</script>

<div class="login-page">
    <header class="login-header">
        <div class="logo">⊚</div>
        <h1>Community Portal</h1>
        <p>Sign in with your handle</p>
    </header>

    <div class="login-body">
        <ErrorBanner message={error} />

        <form onsubmit={(e) => { e.preventDefault(); submit(); }}>
            <label class="field">
                <span>Handle</span>
                <div class="handle-input">
                    <input
                        type="text"
                        bind:value={handle}
                        placeholder="your_handle"
                        autocomplete="username"
                        autocapitalize="none"
                        spellcheck={false}
                        disabled={loading}
                    />
                </div>
            </label>

            <label class="field">
                <span>Password</span>
                <input
                    type="password"
                    bind:value={password}
                    autocomplete="current-password"
                    disabled={loading}
                />
            </label>

            <button type="submit" class="btn-primary" disabled={loading}>
                {loading ? "Signing in…" : "Sign in"}
            </button>
        </form>

        {#if onApply}
            <p class="apply-link">
                Not a member yet?
                <button class="link-btn" onclick={onApply}>Apply to join</button>
            </p>
        {/if}
    </div>
</div>

<style>
    .login-page {
        min-height: 100dvh;
        display: flex;
        flex-direction: column;
        align-items: center;
        background: #f0fdf4;
        padding: 0 1.5rem;
    }

    .login-header {
        text-align: center;
        padding: 3.5rem 0 2rem;
    }

    .logo { font-size: 3rem; margin-bottom: 0.5rem; }

    .login-header h1 {
        font-size: 1.7rem;
        font-weight: 700;
        color: #14532d;
        margin: 0;
    }

    .login-header p {
        color: #4ade80;
        margin: 0.4rem 0 0;
        color: #166534;
    }

    .login-body {
        width: 100%;
        max-width: 360px;
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
    }

    .field { display: flex; flex-direction: column; gap: 0.4rem; }

    .field > span { font-size: 0.85rem; font-weight: 500; color: #374151; }

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
        border: none;
        outline: none;
        font-size: 1rem;
        padding: 0.75rem 1rem 0.75rem 0;
        flex: 1;
        background: transparent;
    }

    .field input[type="password"] {
        border: 1px solid #cbd5e1;
        border-radius: 10px;
        font-size: 1rem;
        padding: 0.75rem 1rem;
        outline: none;
        transition: border-color 0.15s;
        width: 100%;
        box-sizing: border-box;
    }

    .field input[type="password"]:focus { border-color: #16a34a; }

    .btn-primary {
        width: 100%;
        padding: 0.9rem;
        background: #16a34a;
        color: #fff;
        border: none;
        border-radius: 12px;
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        margin-top: 0.25rem;
        transition: background 0.15s;
    }

    .btn-primary:disabled { background: #86efac; cursor: default; }
    .btn-primary:not(:disabled):active { background: #15803d; }

    .apply-link {
        text-align: center;
        font-size: 0.9rem;
        color: #64748b;
        margin: 0;
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
</style>
