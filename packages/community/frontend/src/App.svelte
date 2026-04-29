<script lang="ts">
    import { onMount } from "svelte";
    import { session, currentPage } from "./lib/session.js";
    import { getSetupStatus } from "./lib/api.js";
    import SetupPage       from "./pages/SetupPage.svelte";
    import LoginPage       from "./pages/LoginPage.svelte";
    import ProfilePage     from "./pages/ProfilePage.svelte";
    import DirectoryPage   from "./pages/DirectoryPage.svelte";
    import ConstitutionPage from "./pages/ConstitutionPage.svelte";
    import SettingsPage        from "./pages/SettingsPage.svelte";
    import CentralBankPage     from "./pages/CentralBankPage.svelte";
    import SocialInsurancePage from "./pages/SocialInsurancePage.svelte";
    import DomainsPage      from "./pages/DomainsPage.svelte";
    import DomainPage      from "./pages/DomainPage.svelte";
    import UnitPage        from "./pages/UnitPage.svelte";
    import LeadershipPage    from "./pages/LeadershipPage.svelte";
    import ApplicationsPage   from "./pages/ApplicationsPage.svelte";
    import HowItWorksPage      from "./pages/HowItWorksPage.svelte";
    import BudgetPage          from "./pages/BudgetPage.svelte";
    import AssociationsPage    from "./pages/AssociationsPage.svelte";
    import AssociationPage     from "./pages/AssociationPage.svelte";
    import AddPersonPage       from "./pages/AddPersonPage.svelte";
    import LocationsPage       from "./pages/LocationsPage.svelte";
    import ProposalsPage       from "./pages/ProposalsPage.svelte";
    import ApplyPage           from "./pages/ApplyPage.svelte";
    import NodesPage           from "./pages/NodesPage.svelte";
    import BottomNav           from "./components/BottomNav.svelte";

    type AppState = "loading" | "setup" | "login" | "apply" | "app";
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

{:else if appState === "apply"}
    <ApplyPage onBack={() => { appState = "login"; }} />

{:else if !loggedIn}
    <LoginPage onApply={() => { appState = "apply"; }} />

{:else}
    <main>
        {#if $currentPage === "profile"}
            <ProfilePage />
        {:else if $currentPage === "directory"}
            <DirectoryPage />
        {:else if $currentPage === "constitution"}
            <ConstitutionPage />
        {:else if $currentPage === "settings"}
            <SettingsPage />
        {:else if $currentPage === "domains"}
            <DomainsPage />
        {:else if $currentPage === "domain"}
            <DomainPage />
        {:else if $currentPage === "unit"}
            <UnitPage />
        {:else if $currentPage === "leadership"}
            <LeadershipPage />
        {:else if $currentPage === "applications"}
            <ApplicationsPage />
        {:else if $currentPage === "how-it-works"}
            <HowItWorksPage />
        {:else if $currentPage === "budget"}
            <BudgetPage />
        {:else if $currentPage === "associations"}
            <AssociationsPage />
        {:else if $currentPage === "association"}
            <AssociationPage />
        {:else if $currentPage === "add-person"}
            <AddPersonPage />
        {:else if $currentPage === "locations"}
            <LocationsPage />
        {:else if $currentPage === "proposals"}
            <ProposalsPage />
        {:else if $currentPage === "nodes"}
            <NodesPage />
        {:else if $currentPage === "central-bank"}
            <CentralBankPage />
        {:else if $currentPage === "social-insurance"}
            <SocialInsurancePage />
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
