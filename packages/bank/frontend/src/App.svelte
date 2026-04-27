<script lang="ts">
    import { onMount } from "svelte";
    import { session, currentPage } from "./lib/session.js";
    import type { SessionData } from "./lib/session.js";
    import AccountPage  from "./pages/AccountPage.svelte";
    import SendPage     from "./pages/SendPage.svelte";
    import HistoryPage  from "./pages/HistoryPage.svelte";
    import SettingsPage from "./pages/SettingsPage.svelte";
    import BottomNav    from "./components/BottomNav.svelte";

    let ready = $state(false);

    onMount(async () => {
        // 1. Community redirected back with #session=<base64-payload>
        const hash = window.location.hash;
        if (hash.startsWith("#session=")) {
            try {
                const raw  = atob(hash.slice("#session=".length));
                const payload = JSON.parse(raw) as { token: string; id: string; firstName: string; lastName: string; handle: string };
                // Fetch bank accounts using the new credential
                const accountsRes = await fetch("/api/me/accounts", {
                    headers: { Authorization: `Bearer ${payload.token}` },
                });
                const accounts = accountsRes.ok
                    ? await accountsRes.json() as { accountId: string; label: string }[]
                    : [];
                const primary = accounts.find(a => a.label === "primary") ?? accounts[0];
                const data: SessionData = {
                    personId:         payload.id,
                    handle:           payload.handle,
                    displayName:      `${payload.firstName} ${payload.lastName}`,
                    token:            payload.token,
                    primaryAccountId: primary?.accountId ?? "",
                };
                session.login(data);
                // Strip the hash so it's not accidentally reused or visible
                history.replaceState(null, "", window.location.pathname + window.location.search);
            } catch {
                // Malformed fragment — fall through to redirect below
            }
        }

        // 2. No session → redirect to community login with our origin as ?return
        if (!$session) {
            const cfg = await fetch("/api/config").then(r => r.json()).catch(() => ({ communityUrl: "" })) as { communityUrl: string };
            const communityUrl = cfg.communityUrl || "http://localhost:3002";
            const returnUrl    = encodeURIComponent(window.location.origin);
            window.location.href = `${communityUrl}/login?return=${returnUrl}`;
            return;
        }

        ready = true;
    });

    // Keep ready in sync if session is already loaded from sessionStorage
    $effect(() => {
        if ($session) ready = true;
    });
</script>

{#if ready && $session}
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

    @media (min-width: 768px) {
        main { margin-left: 220px; }
    }
</style>

