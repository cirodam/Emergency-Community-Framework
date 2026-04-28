<script lang="ts">
    import { onMount } from "svelte";
    import { session, currentPage } from "./lib/session.js";
    import type { SessionData } from "./lib/session.js";
    import AccountsPage from "./pages/AccountsPage.svelte";
    import AccountPage  from "./pages/AccountPage.svelte";
    import SendPage     from "./pages/SendPage.svelte";
    import HistoryPage  from "./pages/HistoryPage.svelte";
    import SettingsPage from "./pages/SettingsPage.svelte";
    import BottomNav    from "./components/BottomNav.svelte";

    // If the URL contains a fresh #session= fragment, any existing sessionStorage
    // data is stale. Clear it immediately so the $effect below does not treat the
    // old session as valid and set ready=true before onMount can process the fragment.
    if (window.location.hash.startsWith("#session=")) {
        session.logout();
    }

    let ready = $state(false);

    onMount(async () => {
        // 1. Community redirected back with #session=<base64-payload>
        const hash = window.location.hash;
        if (hash.startsWith("#session=")) {
            try {
                const raw  = decodeURIComponent(atob(hash.slice("#session=".length)));
                const payload = JSON.parse(raw) as { token: string; id: string; firstName: string; lastName: string; handle: string };
                // Fetch bank accounts using the new credential.
                // Retry up to 5 times with 1 s delay — the community's
                // onPersonJoined hook opens the account asynchronously so
                // it may not exist yet by the time we get here.
                let accounts: { accountId: string; label: string }[] = [];
                for (let attempt = 0; attempt < 5; attempt++) {
                    const r = await fetch("/api/me/accounts", {
                        headers: { Authorization: `Bearer ${payload.token}` },
                    });
                    if (r.ok) {
                        const fetched = await r.json() as { accountId: string; label: string }[];
                        if (fetched.length > 0) { accounts = fetched; break; }
                    } else if (r.status === 401 || r.status === 403) {
                        break; // stale token — no point retrying
                    }
                    if (attempt < 4) await new Promise(res => setTimeout(res, 1000));
                }
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
        if ($session) {
            ready = true;
        } else if (ready) {
            // Session was cleared (e.g. 401 on an API call) — redirect to login
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
    <main>
        {#if $currentPage === "accounts"}
            <AccountsPage />
        {:else if $currentPage === "account"}
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

