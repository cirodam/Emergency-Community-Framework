<script lang="ts">
    import { onMount } from "svelte";
    import { session, currentPage } from "./lib/session.js";
    import { getSetupStatus } from "./lib/api.js";
    import SetupPage       from "./pages/SetupPage.svelte";
    import LoginPage       from "./pages/LoginPage.svelte";
    import ProfilePage     from "./pages/ProfilePage.svelte";
    import DirectoryPage   from "./pages/DirectoryPage.svelte";
    import ConstitutionPage from "./pages/ConstitutionPage.svelte";
    import EconomicsPage   from "./pages/EconomicsPage.svelte";
    import SettingsPage    from "./pages/SettingsPage.svelte";
    import DomainsPage     from "./pages/DomainsPage.svelte";
    import DomainPage      from "./pages/DomainPage.svelte";
    import BottomNav       from "./components/BottomNav.svelte";

    type AppState = "loading" | "setup" | "login" | "app";
    let appState: AppState = $state("loading");

    onMount(async () => {
        try {
            const { needsSetup } = await getSetupStatus();
            if (needsSetup) {
                appState = "setup";
            } else if ($session) {
                appState = "app";
            } else {
                appState = "login";
            }
        } catch {
            // If status check fails, fall through to login
            appState = $session ? "app" : "login";
        }
    });

    const loggedIn = $derived(!!$session);
</script>

{#if appState === "loading"}
    <div class="splash">
        <div class="splash-logo">⊚</div>
    </div>

{:else if appState === "setup"}
    <SetupPage onComplete={() => { appState = "login"; }} />

{:else if !loggedIn}
    <LoginPage />

{:else}
    <main>
        {#if $currentPage === "profile"}
            <ProfilePage />
        {:else if $currentPage === "directory"}
            <DirectoryPage />
        {:else if $currentPage === "constitution"}
            <ConstitutionPage />
        {:else if $currentPage === "economy"}
            <EconomicsPage />
        {:else if $currentPage === "settings"}
            <SettingsPage />
        {:else if $currentPage === "domains"}
            <DomainsPage />
        {:else if $currentPage === "domain"}
            <DomainPage />
        {/if}
    </main>
    <BottomNav />
{/if}

<style>
    :global(*, *::before, *::after) { box-sizing: border-box; }

    :global(body) {
        margin: 0;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        background: #f0fdf4;
        color: #0f172a;
        -webkit-font-smoothing: antialiased;
    }

    main {
        min-height: 100dvh;
    }

    @media (min-width: 768px) {
        main { margin-left: 220px; }
    }

    .splash {
        min-height: 100dvh;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #f0fdf4;
    }

    .splash-logo {
        font-size: 3rem;
        animation: pulse 1.4s ease-in-out infinite;
    }

    @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.4; }
    }
</style>
