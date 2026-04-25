<script lang="ts">
    import { currentPage, type Page } from "../lib/session.js";

    interface NavItem { id: Page; label: string; icon: string; }

    const items: NavItem[] = [
        { id: "profile",      label: "Profile",      icon: "◉" },
        { id: "directory",    label: "Directory",    icon: "⊞" },
        { id: "domains",      label: "Governance",   icon: "⊛" },
        { id: "constitution", label: "Constitution", icon: "§" },
        { id: "economy",      label: "Economy",      icon: "⊕" },
        { id: "settings",     label: "Settings",     icon: "⚙" },
    ];
</script>

<nav class="bottom-nav">
    <div class="nav-brand">
        <span class="brand-icon">⊚</span>
        <span class="brand-name">Community</span>
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

    .nav-item.active { color: #16a34a; }

    .nav-icon  { font-size: 1.3rem; line-height: 1; }
    .nav-label { font-size: 0.65rem; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em; }

    .nav-brand { display: none; }

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

        .brand-icon { font-size: 1.4rem; color: #16a34a; }
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

        .nav-item.active { background: #f0fdf4; }

        .nav-icon  { font-size: 1.1rem; }
        .nav-label { font-size: 0.9rem; text-transform: none; letter-spacing: 0; font-weight: 500; }
    }
</style>
