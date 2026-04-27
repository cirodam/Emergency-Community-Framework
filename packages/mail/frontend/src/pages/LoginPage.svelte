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
        <div class="logo">✉</div>
        <h1>ECF Mail</h1>
        <p>Community messaging</p>
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

            <button class="btn-primary" type="submit" disabled={loading}>
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
        justify-content: center;
        padding: 2rem 1.5rem;
        background: #f0fdf4;
    }

    .login-header {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.25rem;
        margin-bottom: 2rem;
    }

    .logo { font-size: 3rem; }
    h1 { font-size: 1.6rem; font-weight: 700; color: #0f172a; margin: 0; }
    p  { color: #64748b; margin: 0; font-size: 0.9rem; }

    .login-body {
        width: 100%;
        max-width: 360px;
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .error-banner {
        background: #fee2e2;
        color: #991b1b;
        padding: 0.75rem 1rem;
        border-radius: 0.75rem;
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

    .handle-input { display: flex; align-items: center; }
    .at {
        padding: 0.75rem 0.5rem 0.75rem 1rem;
        background: #f1f5f9;
        border: 1px solid #cbd5e1;
        border-right: none;
        border-radius: 0.75rem 0 0 0.75rem;
        color: #94a3b8;
        font-size: 1rem;
    }
    .handle-input input { border-radius: 0 0.75rem 0.75rem 0; }

    input {
        width: 100%;
        padding: 0.75rem 1rem;
        border: 1px solid #cbd5e1;
        border-radius: 0.75rem;
        font-size: 1rem;
        outline: none;
        background: #fff;
    }
    input:focus { border-color: #16a34a; box-shadow: 0 0 0 2px #dcfce7; }

    .btn-primary {
        width: 100%;
        padding: 0.85rem;
        background: #16a34a;
        color: #fff;
        border: none;
        border-radius: 0.75rem;
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        margin-top: 0.25rem;
    }
    .btn-primary:disabled { background: #86efac; cursor: default; }
</style>
