<script lang="ts">
    import { session } from "../lib/session.js";
    import { login } from "../lib/api.js";

    let handle   = $state("");
    let password = $state("");
    let error    = $state("");
    let loading  = $state(false);

    async function submit() {
        error = "";
        if (!handle.trim()) { error = "Enter your handle"; return; }
        if (!password)      { error = "Enter your password"; return; }

        loading = true;
        try {
            const person = await login(handle.trim().toLowerCase(), password);
            session.login(person);
        } catch (e) {
            error = e instanceof Error ? e.message : "Login failed";
        } finally {
            loading = false;
        }
    }
</script>

<div class="login-page">
    <header class="login-header">
        <div class="logo">🏪</div>
        <h1>ECF Market</h1>
        <p>Sign in to browse and post listings</p>
    </header>

    <div class="login-body">
        {#if error}
            <div class="error-banner">{error}</div>
        {/if}

        <form onsubmit={(e) => { e.preventDefault(); submit(); }}>
            <label class="field">
                <span>Handle</span>
                <div class="handle-input">
                    <span class="at">@</span>
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
        padding: 3rem 0 2rem;
    }

    .logo {
        font-size: 3rem;
        line-height: 1;
        margin-bottom: 0.5rem;
    }

    h1 {
        font-size: 1.75rem;
        font-weight: 700;
        color: #14532d;
        margin: 0 0 0.25rem;
    }

    p {
        color: #6b7280;
        margin: 0;
        font-size: 0.9rem;
    }

    .login-body {
        width: 100%;
        max-width: 380px;
        background: white;
        border-radius: 1rem;
        padding: 2rem;
        box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .error-banner {
        background: #fee2e2;
        color: #991b1b;
        border-radius: 0.5rem;
        padding: 0.75rem 1rem;
        font-size: 0.875rem;
    }

    .field {
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
        font-size: 0.875rem;
        font-weight: 500;
        color: #374151;
    }

    .handle-input {
        display: flex;
        align-items: center;
        border: 1px solid #d1d5db;
        border-radius: 0.5rem;
        overflow: hidden;
    }

    .at {
        padding: 0 0.5rem 0 0.75rem;
        color: #9ca3af;
        font-size: 1rem;
    }

    .handle-input input {
        border: none;
        flex: 1;
        padding: 0.625rem 0.75rem 0.625rem 0;
        font-size: 1rem;
        outline: none;
    }

    input[type="password"] {
        width: 100%;
        padding: 0.625rem 0.75rem;
        font-size: 1rem;
        border: 1px solid #d1d5db;
        border-radius: 0.5rem;
        box-sizing: border-box;
        outline: none;
    }

    input:focus {
        border-color: #16a34a;
        box-shadow: 0 0 0 2px rgba(22,163,74,0.15);
    }

    .btn-primary {
        width: 100%;
        padding: 0.75rem;
        background: #16a34a;
        color: white;
        font-size: 1rem;
        font-weight: 600;
        border: none;
        border-radius: 0.5rem;
        cursor: pointer;
        transition: background 0.15s;
        margin-top: 0.5rem;
    }

    .btn-primary:hover:not(:disabled) {
        background: #15803d;
    }

    .btn-primary:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }
</style>
