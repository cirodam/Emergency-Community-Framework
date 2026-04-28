<script lang="ts">
    import { currentPage } from "../lib/nav.js";
    import { session } from "../lib/session.js";
    import AppSwitcher from "./AppSwitcher.svelte";

    const items = [
        { id: "classifieds",  label: "Classifieds",  icon: "⊞" },
        { id: "services",     label: "Services",     icon: "⚙" },
        { id: "marketplaces", label: "Marketplaces", icon: "⊕" },
    ] as const;

    function isActive(id: string): boolean {
        const p = $currentPage;
        if (id === "marketplaces") return p === "marketplaces" || p === "marketplace" || p === "stalls" || p === "stall";
        return p === id;
    }
</script>

<aside class="sidebar">
    <div class="sidebar-top">
        <AppSwitcher />
        <div class="brand">
            <span class="brand-icon">⊕</span>
            <span class="brand-name">Market</span>
        </div>
    </div>

    <nav class="nav-list">
        {#each items as item}
            <button
                class="nav-item"
                class:active={isActive(item.id)}
                onclick={() => currentPage.set(item.id)}
            >
                <span class="nav-icon">{item.icon}</span>
                <span class="nav-label">{item.label}</span>
            </button>
        {/each}
    </nav>

    {#if $session}
        <div class="sidebar-footer">
            <div class="user-info">
                <div class="user-avatar">{$session.firstName[0]}{$session.lastName[0]}</div>
                <div class="user-meta">
                    <span class="user-name">{$session.firstName} {$session.lastName}</span>
                    <span class="user-handle">@{$session.handle}</span>
                </div>
            </div>
            <button class="signout-btn" onclick={() => session.logout()}>Sign out</button>
        </div>
    {/if}
</aside>

<style>
    .sidebar {
        width: 14rem;
        min-height: 100dvh;
        height: 100dvh;
        position: sticky;
        top: 0;
        flex-shrink: 0;
        background: #f8fafc;
        border-right: 1px solid #e2e8f0;
        display: flex;
        flex-direction: column;
        padding: 0.75rem 0.625rem 1rem;
        gap: 0.25rem;
        overflow-y: auto;
    }

    /* ── Top ───────────────────────────────────────────────────────────────── */

    .sidebar-top {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0 0.375rem 0.5rem;
        border-bottom: 1px solid #e2e8f0;
        margin-bottom: 0.5rem;
        flex-shrink: 0;
    }

    .brand {
        display: flex;
        align-items: center;
        gap: 0.35rem;
        font-weight: 700;
        font-size: 0.95rem;
        color: #0f172a;
    }

    .brand-icon { font-size: 1rem; color: #16a34a; }

    /* ── Nav ───────────────────────────────────────────────────────────────── */

    .nav-list {
        display: flex;
        flex-direction: column;
        gap: 0.125rem;
        flex: 1;
    }

    .nav-item {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        width: 100%;
        padding: 0.65rem 0.875rem;
        background: none;
        border: none;
        border-radius: 10px;
        font-size: 0.9rem;
        font-weight: 500;
        color: #374151;
        cursor: pointer;
        font-family: inherit;
        text-align: left;
        transition: background 0.1s, color 0.1s;
    }
    .nav-item:hover { background: #e2e8f0; }
    .nav-item.active { background: #f0fdf4; color: #15803d; font-weight: 600; }

    .nav-icon  { font-size: 1.1rem; line-height: 1; }

    /* ── Footer ────────────────────────────────────────────────────────────── */

    .sidebar-footer {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        margin-top: auto;
        padding: 0.75rem 0.25rem 0;
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
        background: #f0fdf4;
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
</style>
