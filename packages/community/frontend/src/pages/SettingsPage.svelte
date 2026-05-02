<script lang="ts">
    import ErrorBanner from "../components/ErrorBanner.svelte";
    import { session } from "../lib/session.js";
    import { getPerson, setPin, updatePerson, changeOwnPassword } from "../lib/api.js";
    import type { PersonDto } from "../lib/api.js";

    const s = $derived($session!);

    // ── Profile load ──────────────────────────────────────────────────────────
    let person: PersonDto | null = $state(null);
    let loadError = $state("");

    async function load() {
        loadError = "";
        try { person = await getPerson(s.handle); }
        catch (e) {
            const msg = e instanceof Error ? e.message : "";
            if (msg.includes("not found") || msg.includes("404")) { session.logout(); return; }
            loadError = msg || "Failed to load profile";
        }
    }

    $effect(() => { load(); });

    const joinYear = $derived(person ? new Date(person.joinDate).getFullYear() : null);

    // ── Phone ─────────────────────────────────────────────────────────────────
    let phoneEdit   = $state("");
    let phoneSaving = $state(false);
    let phoneMsg    = $state("");
    let phoneError  = $state("");

    async function savePhone() {
        phoneMsg = ""; phoneError = "";
        const trimmed = phoneEdit.trim();
        if (!trimmed) { phoneError = "Enter a phone number."; return; }
        phoneSaving = true;
        try {
            const updated = await updatePerson(s.handle, { phone: trimmed });
            person = updated;
            phoneMsg = "Phone number saved.";
            phoneEdit = "";
        } catch (e) {
            phoneError = e instanceof Error ? e.message : "Failed to save phone.";
        } finally {
            phoneSaving = false;
        }
    }

    // ── SMS PIN ───────────────────────────────────────────────────────────────
    let pin        = $state("");
    let pinConfirm = $state("");
    let pinSaving  = $state(false);
    let pinMsg     = $state("");
    let pinError   = $state("");

    async function savePin() {
        pinMsg = ""; pinError = "";
        if (!/^\d{4,8}$/.test(pin)) { pinError = "PIN must be 4–8 digits."; return; }
        if (pin !== pinConfirm)      { pinError = "PINs do not match.";      return; }
        pinSaving = true;
        try {
            await setPin(s.handle, pin);
            pinMsg = "PIN saved.";
            pin = ""; pinConfirm = "";
        } catch (e) {
            pinError = e instanceof Error ? e.message : "Failed to save PIN.";
        } finally {
            pinSaving = false;
        }
    }

    // ── Password ──────────────────────────────────────────────────────────────
    let newPassword = $state("");
    let passError   = $state("");
    let passOk      = $state(false);
    let passLoading = $state(false);

    async function changePassword() {
        passError = "";
        if (newPassword.length < 8) { passError = "Password must be at least 8 characters"; return; }
        passLoading = true;
        try {
            await changeOwnPassword(newPassword);
            session.refresh({ hasPassword: true });
            passOk = true;
            newPassword = "";
        } catch (e) {
            passError = e instanceof Error ? e.message : "Failed to update password";
        } finally {
            passLoading = false;
        }
    }
</script>

<div class="settings-page">

    <!-- Profile header -->
    <header class="profile-header">
        <div class="avatar">{s.firstName[0]}{s.lastName[0]}</div>
        <div class="name">{s.firstName} {s.lastName}</div>
        <div class="handle">@{s.handle}</div>
    </header>

    <!-- Member info card -->
    {#if loadError}
        <p class="load-error">{loadError}</p>
    {:else if person}
        <div class="info-card">
            {#if person.phone}
                <div class="info-row"><span>Phone</span><strong>{person.phone}</strong></div>
            {/if}
            {#if joinYear}
                <div class="info-row"><span>Member since</span><strong>{joinYear}</strong></div>
            {/if}
            <div class="info-row">
                <span>Status</span>
                <strong class="status" class:retired={person.retired} class:disabled={person.disabled}>
                    {person.retired ? "Retired" : person.disabled ? "Exempt" : "Active"}
                </strong>
            </div>
            <div class="info-row"><span>Member ID</span><code>{person.id.slice(0, 12)}…</code></div>
        </div>
    {/if}

    <!-- Phone number -->
    <div class="section-title">Phone number</div>
    <div class="settings-section">
        <p class="hint">Used for SMS banking. Include country code (e.g. +14043906829).</p>
        {#if person?.phone}
            <p class="current-val">Current: <strong>{person.phone}</strong></p>
        {/if}
        {#if phoneError}<p class="field-error">{phoneError}</p>{/if}
        {#if phoneMsg}<p class="field-ok">{phoneMsg}</p>{/if}
        <label class="field">
            <span>{person?.phone ? "New phone number" : "Set phone number"}</span>
            <input
                type="tel"
                placeholder="+14043906829"
                bind:value={phoneEdit}
                disabled={phoneSaving}
                autocomplete="tel"
                onkeydown={(e) => e.key === "Enter" && savePhone()}
            />
        </label>
        <button class="btn-primary" onclick={savePhone} disabled={phoneSaving || !phoneEdit.trim()}>
            {phoneSaving ? "Saving…" : person?.phone ? "Update phone" : "Set phone"}
        </button>
    </div>

    <!-- SMS PIN -->
    <div class="section-title">SMS banking PIN</div>
    <div class="settings-section">
        <p class="hint">Set a 4–8 digit PIN to send kin via SMS. Text <strong>BALANCE</strong> or <strong>SEND &lt;amt&gt; @handle &lt;pin&gt;</strong> to your community's number.</p>
        {#if pinError}<p class="field-error">{pinError}</p>{/if}
        {#if pinMsg}<p class="field-ok">{pinMsg}</p>{/if}
        <div class="pin-row">
            <label class="field">
                <span>New PIN</span>
                <input
                    type="password"
                    inputmode="numeric"
                    pattern="\d{4,8}"
                    maxlength={8}
                    placeholder="••••"
                    bind:value={pin}
                    disabled={pinSaving}
                    autocomplete="new-password"
                />
            </label>
            <label class="field">
                <span>Confirm PIN</span>
                <input
                    type="password"
                    inputmode="numeric"
                    pattern="\d{4,8}"
                    maxlength={8}
                    placeholder="••••"
                    bind:value={pinConfirm}
                    disabled={pinSaving}
                    autocomplete="new-password"
                />
            </label>
        </div>
        <button class="btn-primary" onclick={savePin} disabled={pinSaving || !pin}>
            {pinSaving ? "Saving…" : "Save PIN"}
        </button>
    </div>

    <!-- Security / password -->
    <div class="section-title">Security</div>
    <div class="settings-section">
        {#if passOk}
            <div class="field-ok" style="text-align:center">Password updated ✓</div>
            <button class="btn-secondary" onclick={() => passOk = false}>OK</button>
        {:else}
            <ErrorBanner message={passError} />
            <label class="field">
                <span>{s.hasPassword ? "New password" : "Set a password"} <small>(min 8 characters)</small></span>
                <input
                    type="password"
                    bind:value={newPassword}
                    autocomplete="new-password"
                    disabled={passLoading}
                    onkeydown={(e) => e.key === "Enter" && changePassword()}
                />
            </label>
            <button class="btn-primary" onclick={changePassword} disabled={passLoading}>
                {passLoading ? "Saving…" : s.hasPassword ? "Change password" : "Set password"}
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

    /* Profile header */
    .profile-header {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.4rem;
        padding: 1.5rem 0 1.75rem;
    }

    .avatar {
        width: 5rem;
        height: 5rem;
        border-radius: 50%;
        background: #dcfce7;
        color: #15803d;
        font-size: 1.6rem;
        font-weight: 700;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 0.5rem;
    }

    .name   { font-size: 1.3rem; font-weight: 700; color: #0f172a; }
    .handle { font-size: 0.95rem; color: #64748b; }

    /* Info card */
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

    .status.retired  { color: #7c3aed; }
    .status.disabled { color: #d97706; }

    .load-error { text-align: center; color: #94a3b8; padding: 1rem 0; }

    /* Section labels */
    .section-title {
        font-size: 0.85rem;
        font-weight: 600;
        color: #475569;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        margin-bottom: 0.75rem;
    }

    /* Settings cards */
    .settings-section {
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 14px;
        padding: 1.25rem;
        display: flex;
        flex-direction: column;
        gap: 0.85rem;
        margin-bottom: 1.5rem;
    }

    .hint { font-size: 0.82rem; color: #64748b; margin: 0; line-height: 1.5; }
    .current-val { font-size: 0.82rem; color: #475569; margin: 0; }
    .field-error { font-size: 0.82rem; color: #dc2626; margin: 0; }
    .field-ok    { font-size: 0.82rem; color: #16a34a; margin: 0; }

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

    .pin-row { display: flex; gap: 0.75rem; }
    .pin-row .field { flex: 1; min-width: 0; }
    .pin-row .field input { letter-spacing: 0.2em; }

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

    .signout-btn {
        width: 100%;
        margin-top: 0.5rem;
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

