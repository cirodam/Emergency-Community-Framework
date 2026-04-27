<script lang="ts">
    import { session } from "./lib/session.js";
    import { currentPage, selectedThreadId } from "./lib/session.js";
    import LoginPage    from "./pages/LoginPage.svelte";
    import InboxPage    from "./pages/InboxPage.svelte";
    import OutboxPage   from "./pages/OutboxPage.svelte";
    import ThreadPage   from "./pages/ThreadPage.svelte";
    import ComposePage  from "./pages/ComposePage.svelte";
    import NavBar       from "./components/NavBar.svelte";
</script>

{#if !$session}
    <LoginPage />
{:else}
    <div class="shell">
        <NavBar />
        <main class="main">
            {#if $currentPage === "inbox"}
                <InboxPage />
            {:else if $currentPage === "outbox"}
                <OutboxPage />
            {:else if $currentPage === "thread" && $selectedThreadId}
                <ThreadPage threadId={$selectedThreadId} />
            {:else if $currentPage === "compose"}
                <ComposePage />
            {:else}
                <InboxPage />
            {/if}
        </main>
    </div>
{/if}

<style>
    :global(*, *::before, *::after) { box-sizing: border-box; }

    :global(body) {
        margin: 0;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        background: #f0fdf4;
        color: #111827;
    }

    .shell {
        display: flex;
        flex-direction: column;
        min-height: 100dvh;
    }

    .main {
        flex: 1;
        overflow-y: auto;
    }
</style>
