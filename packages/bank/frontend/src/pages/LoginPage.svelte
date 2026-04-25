<script lang="ts">
    import ErrorBanner from "../components/ErrorBanner.svelte";
    import { session, currentPage } from "../lib/session.js";
    import { login } from "../lib/api.js";
    import type { SessionData } from "../lib/session.js";

    let handle   = $state("");
    let password = $state("");
    let error    = $state("");
    let loading  = $state(false);

    async function submit() {
        error = "";
        if (!handle.trim())   { error = "Enter your community handle"; return; }
        if (!password)        { error = "Enter your password"; return; }

        loading = true;
        try {
            const result = await login(handle.trim().toLowerCase(), password);
            const primary = result.accounts.find(a => a.label === "primary") ?? result.accounts[0];
            if (!primary) throw new Error("No bank account found. Please contact your community administrator.");

            const data: SessionData = {
                personId:         result.personId,
                handle:           result.handle,
                displayName:      result.displayName,
                token:            result.token,
                primaryAccountId: primary.accountId,
            };
            session.login(data);
            currentPage.go("account");
        } catch (e) {
            error = e instanceof Error ? e.message : "Login failed";
        } finally {
            loading = false;
        }
    }
</script>

<div class="login-page">
    <header class="login-header">
        <div class="logo">◈</div>
        <h1>ECF Bank</h1>
        <p>Sign in with your community account</p>
    </header>

    <div class="login-body">
        <ErrorBanner message={error} />

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

        <p class="hint">Use the same credentials as your Community Portal.</p>
    </div>
</div>

<style>
    .login-page {
        min-height: 100dvh;
        display: flex;
        flex-direction: column;
        align-items: center;
        background: #f0f9ff;
        padding: 0 1.5rem;
    }

    .login-header {
        text-align: center;
        padding: 3rem 0 2rem;
    }

    .logo {
        font-size: 2.5rem;
        line-height: 1;
        margin-bottom: 0.5rem;
    }

    .login-header h1 {
        font-size: 2rem;
        font-weight: 700;
        color: #0f172a;
        margin: 0;
    }

    .login-header p {
        color: #64748b;
        margin: 0.4rem 0 0;
    }

    .login-body {
        width: 100%;
        max-width: 360px;
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
    }

    .field { display: flex; flex-direction: column; gap: 0.4rem; }

    .field span { font-size: 0.85rem; font-weight: 500; color: #475569; }

    .handle-input {
        display: flex;
        align-items: center;
        border: 1px solid #cbd5e1;
        border-radius: 10px;
        overflow: hidden;
        transition: border-color 0.15s;
    }

    .handle-input:focus-within { border-color: #2563eb; }

    .at {
        padding: 0 0.75rem;
        color: #94a3b8;
        font-size: 1rem;
        line-height: 1;
        user-select: none;
    }

    .handle-input input {
        border: none;
        flex: 1;
        font-size: 1rem;
        padding: 0.75rem 1rem 0.75rem 0;
        outline: none;
        background: transparent;
    }

    .field input {
        border: 1px solid #cbd5e1;
        border-radius: 10px;
        font-size: 1rem;
        padding: 0.75rem 1rem;
        outline: none;
        transition: border-color 0.15s;
    }

    .field input:focus { border-color: #2563eb; }

    .btn-primary {
        width: 100%;
        padding: 0.9rem;
        background: #2563eb;
        color: #fff;
        border: none;
        border-radius: 12px;
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.15s;
    }

    .btn-primary:disabled { background: #93c5fd; cursor: default; }
    .btn-primary:not(:disabled):active { background: #1d4ed8; }

    .hint {
        text-align: center;
        font-size: 0.8rem;
        color: #94a3b8;
        margin: 0;
    }
</style>
