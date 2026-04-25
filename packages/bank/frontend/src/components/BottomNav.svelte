<script lang="ts">
    import { currentPage, type Page } from "../lib/session.js";

    interface NavItem { id: Page; label: string; icon: string; }

    const items: NavItem[] = [
        { id: "account",  label: "Account",  icon: "◈" },
        { id: "send",     label: "Send",     icon: "↑" },
        { id: "history",  label: "History",  icon: "≡" },
        { id: "settings", label: "Settings", icon: "⚙" },
    ];
</script>

<nav class="bottom-nav">
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

    .nav-item.active { color: #2563eb; }

    .nav-icon  { font-size: 1.3rem; line-height: 1; }
    .nav-label { font-size: 0.65rem; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em; }
</style>
