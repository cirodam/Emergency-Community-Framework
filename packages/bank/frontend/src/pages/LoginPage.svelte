<script lang="ts">
    import PinPad from "../components/PinPad.svelte";
    import ErrorBanner from "../components/ErrorBanner.svelte";
    import { session, currentPage } from "../lib/session.js";
    import { loginWithPin, loginWithPassword, getAccountsByOwner } from "../lib/api.js";

    type Mode = "pin" | "password";
    let mode: Mode  = $state("pin");
    let phone       = $state("");
    let pin         = $state("");
    let password    = $state("");
    let error       = $state("");
    let loading     = $state(false);

    async function submit() {
        error = "";
        if (!phone.trim()) { error = "Enter your phone number"; return; }

        loading = true;
        try {
            const owner = mode === "pin"
                ? await loginWithPin(phone.trim(), pin)
                : await loginWithPassword(phone.trim(), password);

            const accounts = await getAccountsByOwner(owner.ownerId);
            const primary  = accounts[0];
            if (!primary) throw new Error("No account found for this owner");

            session.login(owner, primary.accountId);
            currentPage.go("account");
        } catch (e) {
            error = e instanceof Error ? e.message : "Login failed";
            pin = "";
        } finally {
            loading = false;
        }
    }

    // Auto-submit when PIN reaches required length
    $effect(() => {
        if (mode === "pin" && pin.length === 6) submit();
    });
</script>

<div class="login-page">
    <header class="login-header">
        <h1>ECF Bank</h1>
        <p>Sign in to your account</p>
    </header>

    <div class="login-body">
        <ErrorBanner message={error} />

        <label class="field">
            <span>Phone number</span>
            <input
                type="tel"
                bind:value={phone}
                placeholder="+1 555 000 0000"
                autocomplete="tel"
                disabled={loading}
            />
        </label>

        <div class="mode-tabs">
            <button class:active={mode === "pin"}      onclick={() => { mode = "pin";      pin = ""; error = ""; }}>PIN</button>
            <button class:active={mode === "password"} onclick={() => { mode = "password"; pin = ""; error = ""; }}>Password</button>
        </div>

        {#if mode === "pin"}
            <PinPad bind:value={pin} maxLength={6} />
        {:else}
            <label class="field">
                <span>Password</span>
                <input
                    type="password"
                    bind:value={password}
                    autocomplete="current-password"
                    disabled={loading}
                    onkeydown={(e) => e.key === "Enter" && submit()}
                />
            </label>
            <button class="btn-primary" onclick={submit} disabled={loading}>
                {loading ? "Signing in…" : "Sign in"}
            </button>
        {/if}
    </div>
</div>

<style>
    .login-page {
        min-height: 100dvh;
        display: flex;
        flex-direction: column;
        align-items: center;
        background: #f8fafc;
        padding: 0 1.5rem;
    }

    .login-header {
        text-align: center;
        padding: 3rem 0 2rem;
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

    .field input {
        border: 1px solid #cbd5e1;
        border-radius: 10px;
        font-size: 1rem;
        padding: 0.75rem 1rem;
        outline: none;
        transition: border-color 0.15s;
    }

    .field input:focus { border-color: #2563eb; }

    .mode-tabs {
        display: flex;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        overflow: hidden;
    }

    .mode-tabs button {
        flex: 1;
        padding: 0.6rem;
        border: none;
        background: none;
        cursor: pointer;
        font-size: 0.9rem;
        color: #64748b;
    }

    .mode-tabs button.active {
        background: #2563eb;
        color: #fff;
        font-weight: 600;
    }

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
</style>
