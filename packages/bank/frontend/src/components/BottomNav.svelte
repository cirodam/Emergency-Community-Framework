<script lang="ts">
    import { currentPage, session, type Page } from "../lib/session.js";
    import AppSwitcher from "./AppSwitcher.svelte";

    interface NavItem { id: Page; label: string; icon: string; }

    const items: NavItem[] = [
        { id: "accounts", label: "Accounts", icon: "◈" },
        { id: "settings", label: "Settings", icon: "⚙" },
    ];
</script>

<nav class="bottom-nav">
    <div class="nav-brand">
        <span class="brand-icon">◈</span>
        <span class="brand-name">Bank</span>
        <div class="brand-switcher"><AppSwitcher /></div>
    </div>
    {#each items as item}
        <button
            class="nav-item"
            class:active={$currentPage === item.id}
            onclick={() => currentPage.go(item.id)}
            aria-current={$currentPage === item.id ? "page" : undefined}
        >
            <span class="nav-icon">{item.icon}</span>
            <span class="nav-label">{item.label}</span>
        </button>
    {/each}

    <div class="sidebar-footer">
        {#if $session}
            <div class="user-info">
                <div class="user-avatar">{$session.displayName.split(" ").map((w: string) => w[0]).slice(0, 2).join("")}</div>
                <div class="user-meta">
                    <span class="user-name">{$session.displayName}</span>
                    <span class="user-handle">@{$session.handle}</span>
                </div>
            </div>
            <button class="signout-btn" onclick={() => session.logout()}>Sign out</button>
        {/if}
    </div>
</nav>

<style>
    .bottom-nav {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        display: flex;
        background: #fff;
        border-top: 1px solid #e2e8f0;
        padding-bottom: env(safe-area-inset-bottom, 0);
        z-index: 100;
    }

    .nav-item {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.2rem;
        padding: 0.6rem 0;
        background: none;
        border: none;
        cursor: pointer;
        color: #94a3b8;
        transition: color 0.15s;
    }

    .nav-item.active { color: #2563eb; }

    .nav-icon  { font-size: 1.3rem; line-height: 1; }
    .nav-label { font-size: 0.65rem; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em; }

    .nav-brand { display: none; }
    .sidebar-footer { display: none; }

    @media (min-width: 768px) {
        .bottom-nav {
            flex-direction: column;
            width: 220px;
            height: 100dvh;
            top: 0;
            bottom: auto;
            right: auto;
            border-top: none;
            border-right: 1px solid #e2e8f0;
            padding: 1.5rem 0 1rem;
            justify-content: flex-start;
            gap: 0.15rem;
            align-items: stretch;
        }

        .nav-brand {
            display: flex;
            align-items: center;
            gap: 0.6rem;
            padding: 0.25rem 1.25rem 1.25rem;
            border-bottom: 1px solid #f1f5f9;
            margin-bottom: 0.5rem;
        }

        .brand-switcher {
            margin-left: auto;
        }

        .brand-icon { font-size: 1.4rem; color: #2563eb; }
        .brand-name { font-size: 0.95rem; font-weight: 700; color: #0f172a; }

        .nav-item {
            flex-direction: row;
            justify-content: flex-start;
            padding: 0.7rem 1rem;
            gap: 0.75rem;
            margin: 0 0.5rem;
            border-radius: 10px;
            flex: none;
            width: auto;
        }

        .nav-item.active { background: #eff6ff; }

        .nav-icon  { font-size: 1.1rem; }
        .nav-label { font-size: 0.9rem; text-transform: none; letter-spacing: 0; font-weight: 500; }

        .sidebar-footer {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
            margin-top: auto;
            padding: 0.75rem 0.5rem 0;
            border-top: 1px solid #e2e8f0;
            flex-shrink: 0;
        }
        .user-info {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0 0.25rem;
        }
        .user-avatar {
            width: 2rem;
            height: 2rem;
            border-radius: 50%;
            background: #eff6ff;
            color: #1d4ed8;
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
        .user-handle { font-size: 0.72rem; color: #94a3b8; }
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
    }
</style>
