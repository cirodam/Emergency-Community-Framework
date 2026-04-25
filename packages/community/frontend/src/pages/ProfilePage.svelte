<script lang="ts">
    import { session } from "../lib/session.js";
    import type { PersonDto } from "../lib/api.js";
    import { getPerson } from "../lib/api.js";

    const s = $derived($session!);

    let person: PersonDto | null = $state(null);
    let loading = $state(true);
    let error = $state("");

    async function load() {
        loading = true;
        error = "";
        try {
            person = await getPerson(s.personId);
        } catch (e) {
            error = e instanceof Error ? e.message : "Failed to load profile";
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
</style>
