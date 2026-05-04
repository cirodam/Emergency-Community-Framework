<script lang="ts">
    import { onMount } from "svelte";
    import { session } from "./lib/session.js";
    import type { SessionData } from "./lib/session.js";
    import { currentPage } from "./lib/nav.js";
    import ClassifiedsPage  from "./pages/ClassifiedsPage.svelte";
    import StallPage         from "./pages/StallPage.svelte";
    import ServicesPage      from "./pages/ServicesPage.svelte";
    import MarketplacesPage  from "./pages/MarketplacesPage.svelte";
    import MarketplacePage   from "./pages/MarketplacePage.svelte";
    import Sidebar           from "./components/Sidebar.svelte";

    let ready = $state(false);

    onMount(async () => {
        const hash = window.location.hash;
        if (hash.startsWith("#session=")) {
            try {
                const raw     = decodeURIComponent(atob(hash.slice("#session=".length)));
                const payload = JSON.parse(raw) as { token: string; id: string; firstName: string; lastName: string; handle: string };
                // Decode appPermissions from the credential token (base64url JSON)
                let appPermissions: Record<string, string[]> = {};
                try {
                    const credJson = atob(payload.token.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(payload.token.length / 4) * 4, "="));
                    const cred = JSON.parse(credJson) as { appPermissions?: Record<string, string[]> };
                    appPermissions = cred.appPermissions ?? {};
                } catch { /* no elevated perms */ }
                const data: SessionData = {
                    personId:  payload.id,
                    firstName: payload.firstName,
                    lastName:  payload.lastName,
                    handle:    payload.handle,
                    token:     payload.token,
                    appPermissions,
                };
                session.logout(); // clear any stale session before installing the new one
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
        <main>
            {#if $currentPage === "classifieds"}
            <ClassifiedsPage />
        {:else if $currentPage === "services"}
            <ServicesPage />
        {:else if $currentPage === "stall"}
            <StallPage />
        {:else if $currentPage === "marketplace"}
            <MarketplacePage />
        {:else}
            <MarketplacesPage />
        {/if}
        </main>
    </div>
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

    .shell {
        display: flex;
        flex-direction: row;
        min-height: 100dvh;
    }

    main { flex: 1; min-width: 0; min-height: 100dvh; }
</style>
