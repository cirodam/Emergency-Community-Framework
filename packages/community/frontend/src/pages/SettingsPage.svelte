<script lang="ts">
    import ErrorBanner from "../components/ErrorBanner.svelte";
    import { session } from "../lib/session.js";
    import { setPassword } from "../lib/api.js";

    const s = $derived($session!);

    let newPassword = $state("");
    let passError   = $state("");
    let passOk      = $state(false);
    let loading     = $state(false);

    async function changePassword() {
        passError = "";
        if (newPassword.length < 8) { passError = "Password must be at least 8 characters"; return; }
        loading = true;
        try {
            await setPassword(s.personId, newPassword);
            session.refresh({ hasPassword: true });
            passOk = true;
            newPassword = "";
        } catch (e) {
            passError = e instanceof Error ? e.message : "Failed to update password";
        } finally {
            loading = false;
        }
    }
</script>

<div class="settings-page">
    <h2 class="page-title">Settings</h2>

    <div class="info-card">
        <div class="info-row"><span>Name</span><strong>{s.firstName} {s.lastName}</strong></div>
        <div class="info-row"><span>Handle</span><strong>@{s.handle}</strong></div>
        {#if s.phone}
            <div class="info-row"><span>Phone</span><strong>{s.phone}</strong></div>
        {/if}
        <div class="info-row"><span>Member ID</span><code>{s.personId}</code></div>
    </div>

    <div class="section-title">Security</div>

    <div class="settings-section">
        {#if passOk}
            <div class="ok-msg">Password updated ✓</div>
            <button class="btn-secondary" onclick={() => passOk = false}>OK</button>
        {:else}
            <ErrorBanner message={passError} />
            <label class="field">
                <span>{s.hasPassword ? "New password" : "Set a password"} <small>(min 8 characters)</small></span>
                <input
                    type="password"
                    bind:value={newPassword}
                    autocomplete="new-password"
                    disabled={loading}
                    onkeydown={(e) => e.key === "Enter" && changePassword()}
                />
            </label>
            <button class="btn-primary" onclick={changePassword} disabled={loading}>
                {loading ? "Saving…" : s.hasPassword ? "Change password" : "Set password"}
            </button>
        {/if}
    </div>

    <button class="signout-btn" onclick={() => session.logout()}>Sign out</button>
</div>

<style>
    .settings-page {
        padding: 1.5rem 1.5rem 6rem;
        max-width: 480px;
        margin: 0 auto;
    }

    @media (min-width: 768px) {
        .settings-page { padding-bottom: 2rem; max-width: 560px; }
    }

    .page-title { font-size: 1.4rem; font-weight: 700; color: #0f172a; margin: 0 0 1.5rem; }

    .info-card {
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 14px;
        overflow: hidden;
        margin-bottom: 1.5rem;
    }

    .info-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.75rem 1.25rem;
        border-bottom: 1px solid #f1f5f9;
        font-size: 0.9rem;
        gap: 1rem;
    }

    .info-row:last-child { border-bottom: none; }
    .info-row span   { color: #64748b; flex-shrink: 0; }
    .info-row strong { font-weight: 600; color: #0f172a; }
    .info-row code   { font-size: 0.7rem; color: #475569; word-break: break-all; text-align: right; }

    .section-title { font-size: 0.85rem; font-weight: 600; color: #475569; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 0.75rem; }

    .settings-section {
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 14px;
        padding: 1.25rem;
        display: flex;
        flex-direction: column;
        gap: 1rem;
        margin-bottom: 1.5rem;
    }

    .field { display: flex; flex-direction: column; gap: 0.4rem; }
    .field span { font-size: 0.85rem; font-weight: 500; color: #374151; }
    .field small { font-weight: 400; opacity: 0.6; }
    .field input {
        border: 1px solid #cbd5e1;
        border-radius: 10px;
        font-size: 1rem;
        padding: 0.75rem 1rem;
        outline: none;
        transition: border-color 0.15s;
    }
    .field input:focus { border-color: #16a34a; }

    .btn-primary {
        width: 100%;
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
        padding: 0.75rem 2rem;
        background: #f1f5f9;
        border: none;
        border-radius: 10px;
        font-size: 0.95rem;
        font-weight: 500;
        cursor: pointer;
        align-self: center;
    }

    .ok-msg { color: #16a34a; font-weight: 600; text-align: center; }

    .signout-btn {
        width: 100%;
        padding: 0.85rem;
        background: none;
        border: 1px solid #fca5a5;
        border-radius: 12px;
        font-size: 1rem;
        font-weight: 600;
        color: #dc2626;
        cursor: pointer;
        transition: background 0.15s;
    }

    .signout-btn:active { background: #fef2f2; }
</style>
