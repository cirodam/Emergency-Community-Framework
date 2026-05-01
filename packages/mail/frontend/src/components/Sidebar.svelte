<script lang="ts">
    import { currentPage, selectedThreadId, session, isModerator } from "../lib/session.js";
    import { getUnreadCount } from "../lib/api.js";
    import { onMount } from "svelte";
    import AppSwitcher from "./AppSwitcher.svelte";

    const s = $derived($session!);
    let unread = $state(0);

    onMount(async () => {
        try { unread = await getUnreadCount(); } catch { /* ignore */ }
    });

    function nav(p: "inbox" | "outbox" | "compose" | "drafts" | "archive" | "search" | "trash") {
        if (p !== "compose") selectedThreadId.set(null);
        currentPage.go(p);
    }

    const active = $derived($currentPage === "thread" ? "inbox" : $currentPage);
</script>

<aside class="sidebar">
    <div class="sidebar-top">
        <AppSwitcher />
        <div class="brand">
            <span class="brand-icon">✉</span>
            <span class="brand-name">Mail</span>
        </div>
    </div>

    <button class="compose-btn" onclick={() => nav("compose")}>
        <span>✎</span> Compose
    </button>

    <nav class="folder-list">
        <button
            class="folder-btn"
            class:active={active === "inbox"}
            onclick={() => nav("inbox")}
        >
            <span class="folder-icon">Inbox</span>
            {#if unread > 0}
                <span class="unread-pill">{unread > 99 ? "99+" : unread}</span>
            {/if}
        </button>
        <button
            class="folder-btn"
            class:active={active === "outbox"}
            onclick={() => nav("outbox")}
        >
            <span class="folder-icon">Sent</span>
        </button>
        <button
            class="folder-btn"
            class:active={active === "drafts"}
            onclick={() => nav("drafts")}
        >
            <span class="folder-icon">Drafts</span>
        </button>
        <button
            class="folder-btn"
            class:active={active === "archive"}
            onclick={() => nav("archive")}
        >
            <span class="folder-icon">Archive</span>
        </button>
        <button
            class="folder-btn"
            class:active={active === "search"}
            onclick={() => nav("search")}
        >
            <span class="folder-icon">Search</span>
        </button>
        <button
            class="folder-btn"
            class:active={active === "trash"}
            onclick={() => nav("trash")}
        >
            <span class="folder-icon">Trash</span>
        </button>
        {#if $isModerator}
            <button
                class="folder-btn"
                class:active={active === "moderation"}
                onclick={() => currentPage.go("moderation")}
            >
                <span class="folder-icon">⚑ Moderation</span>
            </button>
        {/if}
    </nav>

    <div class="sidebar-footer">
        <div class="user-info">
            <div class="user-avatar">{s.firstName[0]}{s.lastName[0]}</div>
            <div class="user-meta">
                <span class="user-name">{s.firstName} {s.lastName}</span>
                <span class="user-handle">@{s.handle}</span>
            </div>
        </div>
        <button class="signout-btn" onclick={() => session.logout()}>Sign out</button>
    </div>
</aside>

<style>
    .sidebar {
        width: 14rem;
        min-height: 100vh;
        background: #f8fafc;
        border-right: 1px solid #e2e8f0;
        display: flex;
        flex-direction: column;
        padding: 0.75rem 0.625rem 1rem;
        gap: 0.25rem;
        position: sticky;
        top: 0;
        flex-shrink: 0;
    }

    .sidebar-top {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0 0.375rem 0.5rem;
        border-bottom: 1px solid #e2e8f0;
        margin-bottom: 0.5rem;
    }

    .brand {
        display: flex;
        align-items: center;
        gap: 0.35rem;
        font-weight: 700;
        font-size: 0.95rem;
        color: #0f172a;
    }

    .brand-icon { font-size: 1rem; }

    .compose-btn {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        width: 100%;
        padding: 0.55rem 0.875rem;
        margin-bottom: 0.5rem;
        background: #16a34a;
        color: #fff;
        border: none;
        border-radius: 0.625rem;
        font-size: 0.875rem;
        font-weight: 600;
        cursor: pointer;
        font-family: inherit;
        transition: background 0.15s;
    }
    .compose-btn:hover { background: #15803d; }

    .folder-list {
        display: flex;
        flex-direction: column;
        gap: 0.125rem;
        flex: 1;
    }

    .folder-btn {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        padding: 0.5rem 0.75rem;
        background: none;
        border: none;
        border-radius: 0.5rem;
        font-size: 0.875rem;
        font-weight: 500;
        color: #374151;
        cursor: pointer;
        font-family: inherit;
        text-align: left;
        transition: background 0.1s, color 0.1s;
    }
    .folder-btn:hover { background: #e2e8f0; }
    .folder-btn.active {
        background: #dcfce7;
        color: #15803d;
        font-weight: 600;
    }

    .unread-pill {
        font-size: 0.7rem;
        font-weight: 700;
        background: #16a34a;
        color: #fff;
        border-radius: 9999px;
        padding: 0.1rem 0.45rem;
        min-width: 1.25rem;
        text-align: center;
    }

    .sidebar-footer {
        border-top: 1px solid #e2e8f0;
        padding-top: 0.75rem;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .user-info {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0 0.375rem;
    }

    .user-avatar {
        width: 2rem;
        height: 2rem;
        border-radius: 50%;
        background: #dcfce7;
        color: #15803d;
        font-size: 0.7rem;
        font-weight: 700;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
    }

    .user-meta {
        display: flex;
        flex-direction: column;
        min-width: 0;
    }

    .user-name {
        font-size: 0.8rem;
        font-weight: 600;
        color: #0f172a;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .user-handle {
        font-size: 0.72rem;
        color: #94a3b8;
    }

    .signout-btn {
        width: 100%;
        padding: 0.35rem 0.75rem;
        background: none;
        border: 1px solid #e2e8f0;
        border-radius: 0.5rem;
        font-size: 0.78rem;
        color: #64748b;
        cursor: pointer;
        font-family: inherit;
        transition: background 0.1s;
    }
    .signout-btn:hover { background: #f1f5f9; color: #0f172a; }
</style>
