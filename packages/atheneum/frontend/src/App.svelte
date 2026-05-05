<script lang="ts">
    import { onMount } from "svelte";
    import { session } from "./lib/session.js";
    import type { SessionData } from "./lib/session.js";
    import { currentPage } from "./lib/nav.js";
    import AtheneumPage    from "./pages/AtheneumPage.svelte";
    import SessionDetailPage from "./pages/SessionDetailPage.svelte";
    import CoursePage      from "./pages/CoursePage.svelte";
    import CreateSessionPage from "./pages/CreateSessionPage.svelte";
    import RequestsPage    from "./pages/RequestsPage.svelte";
    import MySessionsPage  from "./pages/MySessionsPage.svelte";
    import AppSwitcher     from "./components/AppSwitcher.svelte";

    let ready = $state(false);

    onMount(async () => {
        const hash = window.location.hash;
        if (hash.startsWith("#session=")) {
            try {
                const raw     = decodeURIComponent(atob(hash.slice("#session=".length)));
                const payload = JSON.parse(raw) as { token: string; id: string; firstName: string; lastName: string; handle: string };
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
                session.logout();
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
        <nav class="sidebar">
            <div class="nav-logo-row">
                <span class="nav-logo">Atheneum</span>
                <AppSwitcher />
            </div>
            <button class="nav-link" onclick={() => currentPage.set("atheneum")}>Sessions</button>
            <button class="nav-link" onclick={() => currentPage.set("requests")}>Requests</button>
            <button class="nav-link" onclick={() => currentPage.set("my-sessions")}>My Sessions</button>
            <button class="nav-link create" onclick={() => currentPage.set("create-session")}>+ Propose Session</button>
            <div class="nav-footer">{$session.handle}</div>
        </nav>
        <main>
            {#if $currentPage === "session"}
                <SessionDetailPage />
            {:else if $currentPage === "course"}
                <CoursePage />
            {:else if $currentPage === "create-session"}
                <CreateSessionPage />
            {:else if $currentPage === "requests"}
                <RequestsPage />
            {:else if $currentPage === "my-sessions"}
                <MySessionsPage />
            {:else}
                <AtheneumPage />
            {/if}
        </main>
    </div>
{/if}

<style>
    :global(*, *::before, *::after) { box-sizing: border-box; }

    :global(body) {
        margin: 0;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        background: #fafaf7;
        color: #111827;
    }

    .shell {
        display: flex;
        flex-direction: row;
        min-height: 100dvh;
    }

    main { flex: 1; min-width: 0; min-height: 100dvh; padding: 2rem; }

    .sidebar {
        width: 200px;
        min-height: 100dvh;
        background: #1e293b;
        color: #f1f5f9;
        display: flex;
        flex-direction: column;
        padding: 1.5rem 1rem;
        gap: 0.5rem;
        flex-shrink: 0;
    }

    .nav-logo-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 1rem;
    }

    .nav-logo {
        font-size: 1.1rem;
        font-weight: 700;
        letter-spacing: 0.05em;
        color: #e2e8f0;
    }

    .nav-link {
        background: none;
        border: none;
        color: #cbd5e1;
        text-align: left;
        padding: 0.5rem 0.75rem;
        border-radius: 6px;
        cursor: pointer;
        font-size: 0.9rem;
    }

    .nav-link:hover { background: #334155; color: #f1f5f9; }

    .nav-link.create {
        margin-top: 0.5rem;
        background: #3b82f6;
        color: #fff;
        font-weight: 600;
    }

    .nav-link.create:hover { background: #2563eb; }

    .nav-footer {
        margin-top: auto;
        font-size: 0.8rem;
        color: #64748b;
        padding: 0.5rem 0.75rem;
    }
</style>
