<script lang="ts">
    import { session } from "./lib/session.js";
    import LoginPage    from "./pages/LoginPage.svelte";
    import ListingsPage from "./pages/ListingsPage.svelte";
</script>

{#if $session}
    <ListingsPage />
{:else}
    <LoginPage />
{/if}

<style>
    :global(*, *::before, *::after) {
        box-sizing: border-box;
    }

    :global(body) {
        margin: 0;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        background: #f0fdf4;
        color: #111827;
    }
</style>
