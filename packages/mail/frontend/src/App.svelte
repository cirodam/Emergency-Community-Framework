<script lang="ts">
    import { onMount } from "svelte";
    import { session } from "./lib/session.js";
    import type { SessionData } from "./lib/session.js";
    import { currentPage, selectedThreadId } from "./lib/session.js";
    import InboxPage    from "./pages/InboxPage.svelte";
    import OutboxPage   from "./pages/OutboxPage.svelte";
    import ThreadPage   from "./pages/ThreadPage.svelte";
    import ComposePage  from "./pages/ComposePage.svelte";
    import Sidebar      from "./components/Sidebar.svelte";

    let ready = $state(false);

    // Clear any stale sessionStorage before processing a fresh login redirect.
    if (window.location.hash.startsWith("#session=")) {
        session.logout();
    }

    onMount(async () => {
        const hash = window.location.hash;
        if (hash.startsWith("#session=")) {
            try {
                const raw     = decodeURIComponent(atob(hash.slice("#session=".length)));
                const payload = JSON.parse(raw) as { token: string; id: string; firstName: string; lastName: string; handle: string };
                const data: SessionData = {
                    personId:  payload.id,
                    firstName: payload.firstName,
                    lastName:  payload.lastName,
                    handle:    payload.handle,
                    token:     payload.token,
                };
                session.login(data);
                history.replaceState(null, "", window.location.pathname + window.location.search);
            } catch {
                // Malformed fragment — fall through to redirect below
            }
        }

        if (!$session) {
            const cfg = await fetch("/api/config").then(r => r.json()).catch(() => ({ communityUrl: "" })) as { communityUrl: string };
            const communityUrl = cfg.communityUrl || "http://localhost:3002";
            const returnUrl    = encodeURIComponent(window.location.origin);
            window.location.href = `${communityUrl}/login?return=${returnUrl}`;
            return;
        }

        ready = true;
    });

    $effect(() => {
        if ($session) {
            ready = true;
        } else if (ready) {
            ready = false;
            fetch("/api/config").then(r => r.json()).catch(() => ({ communityUrl: "" })).then((cfg: { communityUrl?: string }) => {
                const communityUrl = cfg.communityUrl || "http://localhost:3002";
                const returnUrl    = encodeURIComponent(window.location.origin);
                window.location.href = `${communityUrl}/login?return=${returnUrl}`;
            });
        }
    });
</script>

{#if ready && $session}
    <div class="shell">
        <Sidebar />
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
        background: #fff;
        color: #111827;
    }

    .shell {
        display: flex;
        flex-direction: row;
        min-height: 100dvh;
    }

    .main {
        flex: 1;
        min-width: 0;
        overflow-y: auto;
        background: #fff;
    }
</style>
