<script lang="ts">
    import { session, currentPage } from "./lib/session.js";
    import LoginPage       from "./pages/LoginPage.svelte";
    import ProfilePage     from "./pages/ProfilePage.svelte";
    import DirectoryPage   from "./pages/DirectoryPage.svelte";
    import ConstitutionPage from "./pages/ConstitutionPage.svelte";
    import SettingsPage    from "./pages/SettingsPage.svelte";
    import BottomNav       from "./components/BottomNav.svelte";

    const loggedIn = $derived(!!$session);
</script>

{#if !loggedIn}
    <LoginPage />
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
</style>
