<script lang="ts">
    import { session } from "../lib/session.js";
    import type { PersonDto } from "../lib/api.js";
    import { getPerson, setPin, updatePerson } from "../lib/api.js";

    function signOut() { session.logout(); }

    const s = $derived($session!);

    let person: PersonDto | null = $state(null);
    let loading = $state(true);
    let error = $state("");

    // ── SMS PIN ───────────────────────────────────────────────────────────────
    let pin        = $state("");
    let pinConfirm = $state("");
    let pinSaving  = $state(false);
    let pinMsg     = $state("");
    let pinError   = $state("");

    // ── Phone ─────────────────────────────────────────────────────────────────
    let phoneEdit    = $state("");
    let phoneSaving  = $state(false);
    let phoneMsg     = $state("");
    let phoneError   = $state("");

    async function savePin() {
        pinMsg = ""; pinError = "";
        if (!/^\d{4,8}$/.test(pin)) { pinError = "PIN must be 4–8 digits."; return; }
        if (pin !== pinConfirm)      { pinError = "PINs do not match.";      return; }
        pinSaving = true;
        try {
            await setPin(s.personId, pin);
            pinMsg = "PIN saved.";
            pin = ""; pinConfirm = "";
        } catch (e) {
            pinError = e instanceof Error ? e.message : "Failed to save PIN.";
        } finally {
            pinSaving = false;
        }
    }

    async function savePhone() {
        phoneMsg = ""; phoneError = "";
        const trimmed = phoneEdit.trim();
        if (!trimmed) { phoneError = "Enter a phone number."; return; }
        phoneSaving = true;
        try {
            const updated = await updatePerson(s.personId, { phone: trimmed });
            person = updated;
            phoneMsg = "Phone number saved.";
            phoneEdit = "";
        } catch (e) {
            phoneError = e instanceof Error ? e.message : "Failed to save phone.";
        } finally {
            phoneSaving = false;
        }
    }

    async function load() {
        loading = true;
        error = "";
        try {
            person = await getPerson(s.personId);
        } catch (e) {
            const msg = e instanceof Error ? e.message : "";
            if (msg.includes("not found") || msg.includes("404")) {
                session.logout();
                return;
            }
            error = msg || "Failed to load profile";
        } finally {
            loading = false;
        }
    }

    $effect(() => { load(); });

    const joinYear = $derived(person ? new Date(person.joinDate).getFullYear() : null);
</script>

<div class="profile-page">
    <header class="profile-header">
        <div class="avatar">{s.firstName[0]}{s.lastName[0]}</div>
        <div class="name">{s.firstName} {s.lastName}</div>
        <div class="handle">@{s.handle}</div>
    </header>

    {#if loading && !person}
        <div class="skeleton"></div>
    {:else if person}
        <div class="info-card">
            {#if person.phone}
                <div class="info-row">
                    <span>Phone</span>
                    <strong>{person.phone}</strong>
                </div>
            {/if}
            <div class="info-row">
                <span>Member since</span>
                <strong>{joinYear}</strong>
            </div>
            <div class="info-row">
                <span>Status</span>
                <strong class="status" class:retired={person.retired} class:disabled={person.disabled}>
                    {person.retired ? "Retired" : person.disabled ? "Exempt" : "Active"}
                </strong>
            </div>
            <div class="info-row">
                <span>Member ID</span>
                <code>{person.id.slice(0, 12)}…</code>
            </div>
        </div>
    {:else if error}
        <p class="error-msg">{error}</p>
    {/if}

    <section class="pin-section">
        <h2>Phone number</h2>
        <p class="pin-hint">Used to identify you for SMS banking. Include country code (e.g. +14043906829).</p>
        {#if person?.phone}
            <p class="current-phone">Current: <strong>{person.phone}</strong></p>
        {/if}
        <div class="pin-fields">
            <input
                type="tel"
                placeholder="+14043906829"
                bind:value={phoneEdit}
                disabled={phoneSaving}
                autocomplete="tel"
            />
        </div>
        {#if phoneError}<p class="pin-error">{phoneError}</p>{/if}
        {#if phoneMsg}<p class="pin-ok">{phoneMsg}</p>{/if}
        <button class="pin-btn" onclick={savePhone} disabled={phoneSaving || !phoneEdit.trim()}>
            {phoneSaving ? "Saving…" : person?.phone ? "Update phone" : "Set phone"}
        </button>
    </section>

    <section class="pin-section">
        <h2>SMS banking PIN</h2>
        <p class="pin-hint">Set a 4–8 digit PIN to send kin via SMS. Text <strong>BALANCE</strong> or <strong>SEND &lt;amt&gt; @handle &lt;pin&gt;</strong> to this community's number.</p>
        <div class="pin-fields">
            <input
                type="password"
                inputmode="numeric"
                pattern="\d{4,8}"
                maxlength={8}
                placeholder="New PIN"
                bind:value={pin}
                disabled={pinSaving}
                autocomplete="new-password"
            />
            <input
                type="password"
                inputmode="numeric"
                pattern="\d{4,8}"
                maxlength={8}
                placeholder="Confirm PIN"
                bind:value={pinConfirm}
                disabled={pinSaving}
                autocomplete="new-password"
            />
        </div>
        {#if pinError}<p class="pin-error">{pinError}</p>{/if}
        {#if pinMsg}<p class="pin-ok">{pinMsg}</p>{/if}
        <button class="pin-btn" onclick={savePin} disabled={pinSaving || !pin}>
            {pinSaving ? "Saving…" : "Save PIN"}
        </button>
    </section>

    <button class="signout-btn" onclick={signOut}>Sign out</button>
</div>

<style>
    .profile-page {
        padding: 1.5rem 1.5rem 6rem;
        max-width: 480px;
        margin: 0 auto;
    }

    @media (min-width: 768px) {
        .profile-page { padding-bottom: 2rem; max-width: 640px; }
    }

    .profile-header {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.4rem;
        padding: 1.5rem 0 2rem;
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

    .name  { font-size: 1.3rem; font-weight: 700; color: #0f172a; }
    .handle { font-size: 0.95rem; color: #64748b; }

    .info-card {
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 16px;
        overflow: hidden;
    }

    .info-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.85rem 1.25rem;
        border-bottom: 1px solid #f1f5f9;
        font-size: 0.9rem;
        gap: 1rem;
    }

    .info-row:last-child { border-bottom: none; }

    .info-row span  { color: #64748b; }
    .info-row strong { font-weight: 600; color: #0f172a; }
    .info-row code   { font-size: 0.75rem; color: #475569; }

    .status.retired  { color: #7c3aed; }
    .status.disabled { color: #d97706; }

    .skeleton {
        background: #e2e8f0;
        border-radius: 16px;
        height: 12rem;
        animation: pulse 1.4s ease-in-out infinite;
    }

    @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
    }

    .error-msg { text-align: center; color: #94a3b8; padding: 2rem 0; }

    .signout-btn {
        width: 100%;
        margin-top: 1.5rem;
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

    .pin-section {
        margin-top: 1.5rem;
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 16px;
        padding: 1.25rem;
    }

    .pin-section h2 {
        font-size: 1rem;
        font-weight: 700;
        color: #0f172a;
        margin: 0 0 0.35rem;
    }

    .pin-hint {
        font-size: 0.82rem;
        color: #64748b;
        margin: 0 0 1rem;
        line-height: 1.5;
    }

    .pin-fields {
        display: flex;
        gap: 0.75rem;
        margin-bottom: 0.75rem;
    }

    .pin-fields input {
        flex: 1;
        min-width: 0;
        padding: 0.65rem 0.85rem;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        font-size: 1rem;
        letter-spacing: 0.2em;
        outline: none;
        transition: border-color 0.15s;
        box-sizing: border-box;
    }

    .pin-fields input:focus { border-color: #22c55e; }

    .pin-error { font-size: 0.82rem; color: #dc2626; margin: 0 0 0.5rem; }
    .pin-ok    { font-size: 0.82rem; color: #16a34a; margin: 0 0 0.5rem; }
    .current-phone { font-size: 0.82rem; color: #475569; margin: 0 0 0.75rem; }

    .pin-btn {
        width: 100%;
        padding: 0.7rem;
        background: #22c55e;
        color: #fff;
        border: none;
        border-radius: 10px;
        font-size: 0.95rem;
        font-weight: 600;
        cursor: pointer;
        transition: opacity 0.15s;
    }

    .pin-btn:disabled { opacity: 0.5; cursor: default; }
    .pin-btn:not(:disabled):active { opacity: 0.85; }
</style>
