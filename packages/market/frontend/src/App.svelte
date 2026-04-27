<script lang="ts">
    import { onMount } from "svelte";
    import { session } from "./lib/session.js";
    import type { SessionData } from "./lib/session.js";
    import ListingsPage from "./pages/ListingsPage.svelte";

    let ready = $state(false);

    onMount(async () => {
        const hash = window.location.hash;
        if (hash.startsWith("#session=")) {
            try {
                const raw     = atob(hash.slice("#session=".length));
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
        if ($session) ready = true;
    });
</script>

{#if ready && $session}
    <ListingsPage />
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
