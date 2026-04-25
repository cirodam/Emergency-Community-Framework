<script lang="ts">
    import { session, currentPage } from "./lib/session.js";
    import LoginPage    from "./pages/LoginPage.svelte";
    import AccountPage  from "./pages/AccountPage.svelte";
    import SendPage     from "./pages/SendPage.svelte";
    import HistoryPage  from "./pages/HistoryPage.svelte";
    import SettingsPage from "./pages/SettingsPage.svelte";
    import BottomNav    from "./components/BottomNav.svelte";

    const loggedIn = $derived(!!$session);
</script>

{#if !loggedIn}
    <LoginPage />
{:else}
    <main>
        {#if $currentPage === "account"}
            <AccountPage />
        {:else if $currentPage === "send"}
            <SendPage />
        {:else if $currentPage === "history"}
            <HistoryPage />
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
        background: #f8fafc;
        color: #0f172a;
        -webkit-font-smoothing: antialiased;
    }

    main {
        min-height: 100dvh;
    }
</style>

