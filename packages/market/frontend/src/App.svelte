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
    import AppSwitcher       from "./components/AppSwitcher.svelte";

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
    <nav class="tab-bar">
        <button class="tab" class:active={$currentPage === "classifieds"} onclick={() => currentPage.set("classifieds")}>
            Classifieds
        </button>
        <button class="tab" class:active={$currentPage === "services"} onclick={() => currentPage.set("services")}>
            Services
        </button>
        <button class="tab" class:active={$currentPage === "marketplaces" || $currentPage === "marketplace" || $currentPage === "stalls" || $currentPage === "stall"} onclick={() => currentPage.set("marketplaces")}>
            Marketplaces
        </button>
        <div class="switcher-slot"><AppSwitcher /></div>
    </nav>

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

    .tab-bar {
        position: sticky;
        top: 0;
        z-index: 50;
        display: flex;
        align-items: center;
        background: #fff;
        border-bottom: 1px solid #e2e8f0;
        padding: 0 1rem;
    }

    .switcher-slot { margin-left: auto; display: flex; align-items: center; }

    .tab {
        padding: 0.75rem 1.25rem;
        font-size: 0.875rem;
        font-weight: 500;
        color: #64748b;
        background: none;
        border: none;
        border-bottom: 2px solid transparent;
        cursor: pointer;
        transition: color 0.15s, border-color 0.15s;
        margin-bottom: -1px;
    }
    .tab:hover   { color: #0f172a; }
    .tab.active  { color: #16a34a; border-bottom-color: #16a34a; }

    main { min-height: calc(100dvh - 45px); }
</style>
