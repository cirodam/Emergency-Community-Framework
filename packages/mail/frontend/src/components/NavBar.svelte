<script lang="ts">
    import { currentPage, selectedThreadId, session } from "../lib/session.js";
    import { getUnreadCount } from "../lib/api.js";
    import type { Page } from "../lib/session.js";
    import { onMount } from "svelte";
    import AppSwitcher from "./AppSwitcher.svelte";

    const s = $derived($session!);

    interface NavItem { id: Page; label: string; icon: string; }

    const items: NavItem[] = [
        { id: "inbox",   label: "Inbox",   icon: "✉" },
        { id: "outbox",  label: "Sent",    icon: "↑" },
        { id: "compose", label: "Compose", icon: "✎" },
    ];

    let unread = $state(0);

    onMount(async () => {
        try { unread = await getUnreadCount(); } catch { /* ignore */ }
    });

    function nav(id: Page) {
        if (id !== "thread") selectedThreadId.set(null);
        currentPage.go(id);
    }
</script>

<header class="navbar">
    <AppSwitcher />

    <div class="brand">
        <span class="brand-icon">✉</span>
        <span class="brand-name">Mail</span>
        {#if unread > 0}
            <span class="unread-badge">{unread > 99 ? "99+" : unread}</span>
        {/if}
    </div>

    <nav class="nav-items">
        {#each items as item (item.id)}
            <button
                class="nav-btn"
                class:active={$currentPage === item.id || ($currentPage === "thread" && item.id === "inbox")}
                onclick={() => nav(item.id)}
            >
                <span class="nav-icon">{item.icon}</span>
                <span class="nav-label">
                    {item.label}
                    {#if item.id === "inbox" && unread > 0}
                        <span class="badge">{unread > 99 ? "99+" : unread}</span>
                    {/if}
                </span>
            </button>
        {/each}
    </nav>

    <button class="signout-btn" onclick={() => session.logout()}>Sign out</button>
</header>

<style>
    .navbar {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 0 1.25rem;
        height: 3.5rem;
        background: #fff;
        border-bottom: 1px solid #e2e8f0;
        position: sticky;
        top: 0;
        z-index: 50;
    }

    .brand {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        font-weight: 700;
        font-size: 1rem;
        color: #0f172a;
        flex-shrink: 0;
    }

    .brand-icon { font-size: 1.15rem; }

    .unread-badge {
        background: #dc2626;
        color: #fff;
        font-size: 0.65rem;
        font-weight: 700;
        padding: 0.1rem 0.35rem;
        border-radius: 9999px;
    }

    .nav-items {
        display: flex;
        gap: 0.25rem;
        flex: 1;
    }

    .nav-btn {
        display: flex;
        align-items: center;
        gap: 0.35rem;
        padding: 0.4rem 0.75rem;
        border: none;
        background: none;
        border-radius: 0.5rem;
        font-size: 0.875rem;
        color: #64748b;
        cursor: pointer;
        font-weight: 500;
        transition: background 0.1s, color 0.1s;
    }

    .nav-btn:hover  { background: #f1f5f9; color: #0f172a; }
    .nav-btn.active { background: #dcfce7; color: #15803d; font-weight: 600; }

    .nav-icon { font-size: 1rem; }

    .badge {
        background: #dc2626;
        color: #fff;
        font-size: 0.65rem;
        font-weight: 700;
        padding: 0.1rem 0.3rem;
        border-radius: 9999px;
        margin-left: 0.2rem;
    }

    .signout-btn {
        margin-left: auto;
        padding: 0.35rem 0.75rem;
        background: none;
        border: 1px solid #e2e8f0;
        border-radius: 0.5rem;
        font-size: 0.8rem;
        color: #94a3b8;
        cursor: pointer;
        flex-shrink: 0;
    }

    .signout-btn:hover { border-color: #fca5a5; color: #dc2626; }
</style>
