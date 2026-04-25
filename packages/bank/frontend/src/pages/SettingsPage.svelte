<script lang="ts">
    import PinPad from "../components/PinPad.svelte";
    import ErrorBanner from "../components/ErrorBanner.svelte";
    import { session } from "../lib/session.js";
    import { setPin, setPassword } from "../lib/api.js";

    const s = $derived($session!);

    type ActivePanel = "none" | "change-pin" | "change-password";
    let panel: ActivePanel = $state("none");

    // Change PIN
    let newPin   = $state("");
    let pinError = $state("");
    let pinOk    = $state(false);

    $effect(() => {
        if (panel === "change-pin" && newPin.length === 6) confirmPin();
    });

    async function confirmPin() {
        pinError = "";
        try {
            await setPin(s.ownerId, newPin);
            session.refresh({ hasPin: true });
            pinOk = true;
            newPin = "";
        } catch (e) {
            pinError = e instanceof Error ? e.message : "Failed to set PIN";
            newPin = "";
        }
    }

    // Change password
    let newPassword  = $state("");
    let passError    = $state("");
    let passOk       = $state(false);
    let passLoading  = $state(false);

    async function confirmPassword() {
        passError = "";
        if (newPassword.length < 8) { passError = "Password must be at least 8 characters"; return; }
        passLoading = true;
        try {
            await setPassword(s.ownerId, newPassword);
            session.refresh({ hasPassword: true });
            passOk = true;
            newPassword = "";
        } catch (e) {
            passError = e instanceof Error ? e.message : "Failed to set password";
        } finally {
            passLoading = false;
        }
    }

    function openPanel(p: ActivePanel) {
        panel = p;
        newPin = ""; pinError = ""; pinOk = false;
        newPassword = ""; passError = ""; passOk = false;
    }
</script>

<div class="settings-page">
    <h2 class="page-title">Settings</h2>

    <div class="info-card">
        <div class="info-row"><span>Name</span><strong>{s.displayName}</strong></div>
        {#if s.phone}
            <div class="info-row"><span>Phone</span><strong>{s.phone}</strong></div>
        {/if}
        <div class="info-row"><span>Owner ID</span><code>{s.ownerId}</code></div>
    </div>

    <div class="settings-list">
        <button class="settings-row" onclick={() => openPanel("change-pin")}>
            <span>Change PIN</span>
            <span class="badge">{s.hasPin ? "Set" : "Not set"}</span>
        </button>
        <button class="settings-row" onclick={() => openPanel("change-password")}>
            <span>Change password</span>
            <span class="badge">{s.hasPassword ? "Set" : "Not set"}</span>
        </button>
        <button class="settings-row danger" onclick={() => session.logout()}>
            <span>Sign out</span>
        </button>
    </div>

    <!-- Change PIN panel -->
    {#if panel === "change-pin"}
        <div class="sheet-backdrop" onclick={() => openPanel("none")} role="presentation"></div>
        <div class="sheet">
            <h3>New PIN</h3>
            {#if pinOk}
                <p class="ok-msg">PIN updated ✓</p>
                <button class="btn-secondary" onclick={() => openPanel("none")}>Done</button>
            {:else}
                <ErrorBanner message={pinError} />
                <PinPad bind:value={newPin} maxLength={6} />
            {/if}
        </div>
    {/if}

    <!-- Change password panel -->
    {#if panel === "change-password"}
        <div class="sheet-backdrop" onclick={() => openPanel("none")} role="presentation"></div>
        <div class="sheet">
            <h3>New Password</h3>
            {#if passOk}
                <p class="ok-msg">Password updated ✓</p>
                <button class="btn-secondary" onclick={() => openPanel("none")}>Done</button>
            {:else}
                <ErrorBanner message={passError} />
                <label class="field">
                    <span>Password (min 8 characters)</span>
                    <input
                        type="password"
                        bind:value={newPassword}
                        autocomplete="new-password"
                        disabled={passLoading}
                        onkeydown={(e) => e.key === "Enter" && confirmPassword()}
                    />
                </label>
                <button class="btn-primary" onclick={confirmPassword} disabled={passLoading}>
                    {passLoading ? "Saving…" : "Save"}
                </button>
                <button class="btn-link" onclick={() => openPanel("none")}>Cancel</button>
            {/if}
        </div>
    {/if}
</div>

<style>
    .settings-page {
        padding: 1.5rem 1.5rem 6rem;
        max-width: 480px;
        margin: 0 auto;
    }

    .page-title { font-size: 1.4rem; font-weight: 700; color: #0f172a; margin: 0 0 1.5rem; }

    .info-card {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 14px;
        padding: 1rem 1.25rem;
        margin-bottom: 1.5rem;
        display: flex;
        flex-direction: column;
        gap: 0.6rem;
    }

    .info-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 0.9rem;
        gap: 1rem;
    }

    .info-row span { color: #64748b; flex-shrink: 0; }
    .info-row strong { font-weight: 600; color: #0f172a; }
    .info-row code {
        font-size: 0.75rem;
        color: #475569;
        word-break: break-all;
        text-align: right;
    }

    .settings-list {
        display: flex;
        flex-direction: column;
        border: 1px solid #e2e8f0;
        border-radius: 14px;
        overflow: hidden;
    }

    .settings-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem 1.25rem;
        background: #fff;
        border: none;
        border-bottom: 1px solid #f1f5f9;
        font-size: 0.95rem;
        cursor: pointer;
        color: #0f172a;
        text-align: left;
    }

    .settings-row:last-child { border-bottom: none; }
    .settings-row:active { background: #f8fafc; }
    .settings-row.danger { color: #dc2626; }

    .badge {
        font-size: 0.75rem;
        background: #f1f5f9;
        color: #64748b;
        border-radius: 99px;
        padding: 0.2rem 0.6rem;
    }

    /* Bottom sheet */
    .sheet-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.35);
        z-index: 200;
    }

    .sheet {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        background: #fff;
        border-radius: 20px 20px 0 0;
        padding: 1.5rem 1.5rem calc(1.5rem + env(safe-area-inset-bottom, 0));
        z-index: 201;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1.25rem;
        max-width: 480px;
        margin: 0 auto;
    }

    .sheet h3 { margin: 0; font-size: 1.1rem; font-weight: 600; }

    .ok-msg { color: #16a34a; font-weight: 600; font-size: 1rem; }

    .field { width: 100%; display: flex; flex-direction: column; gap: 0.4rem; }
    .field span { font-size: 0.85rem; font-weight: 500; color: #475569; }
    .field input {
        border: 1px solid #cbd5e1;
        border-radius: 10px;
        font-size: 1rem;
        padding: 0.75rem 1rem;
        outline: none;
        width: 100%;
        box-sizing: border-box;
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
    }
    .btn-primary:disabled { background: #93c5fd; cursor: default; }

    .btn-secondary {
        padding: 0.75rem 2.5rem;
        background: #f1f5f9;
        border: none;
        border-radius: 10px;
        font-size: 0.95rem;
        font-weight: 500;
        cursor: pointer;
    }

    .btn-link {
        background: none;
        border: none;
        color: #64748b;
        font-size: 0.9rem;
        cursor: pointer;
        text-decoration: underline;
    }
</style>
