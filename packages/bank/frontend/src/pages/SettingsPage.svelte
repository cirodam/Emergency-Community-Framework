<script lang="ts">
    import { session } from "../lib/session.js";

    const s = $derived($session!);
</script>

<div class="settings-page">
    <h2 class="page-title">Settings</h2>

    <div class="info-card">
        <div class="info-row"><span>Name</span><strong>{s.displayName}</strong></div>
        <div class="info-row"><span>Handle</span><strong>@{s.handle}</strong></div>
        <div class="info-row"><span>Account ID</span><code>{s.primaryAccountId}</code></div>
    </div>

    <div class="notice-card">
        <p>
            To change your password or manage your account settings, visit the
            <strong>Community Portal</strong>.
        </p>
    </div>

    <div class="settings-list">
        <button class="settings-row danger" onclick={() => session.logout()}>
            <span>Sign out</span>
        </button>
    </div>
</div>

<style>
    .settings-page {
        padding: 1.5rem 1.5rem 6rem;
        max-width: 480px;
        margin: 0 auto;
    }

    @media (min-width: 768px) {
        .settings-page { padding-bottom: 2rem; max-width: 560px; }
    }

    .page-title { font-size: 1.4rem; font-weight: 700; color: #0f172a; margin: 0 0 1.5rem; }

    .info-card {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 14px;
        padding: 1rem 1.25rem;
        margin-bottom: 1rem;
        display: flex;
        flex-direction: column;
        gap: 0.6rem;
    }

    .info-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 0.9rem;
        gap: 1rem;
    }

    .info-row span { color: #64748b; flex-shrink: 0; }
    .info-row strong { font-weight: 600; color: #0f172a; }
    .info-row code {
        font-size: 0.75rem;
        color: #475569;
        word-break: break-all;
        text-align: right;
    }

    .notice-card {
        background: #eff6ff;
        border: 1px solid #bfdbfe;
        border-radius: 12px;
        padding: 0.875rem 1.25rem;
        margin-bottom: 1.5rem;
        font-size: 0.875rem;
        color: #1e40af;
        line-height: 1.5;
    }

    .notice-card p { margin: 0; }

    .settings-list {
        display: flex;
        flex-direction: column;
        border: 1px solid #e2e8f0;
        border-radius: 14px;
        overflow: hidden;
    }

    .settings-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem 1.25rem;
        background: #fff;
        border: none;
        border-bottom: 1px solid #f1f5f9;
        font-size: 0.95rem;
        cursor: pointer;
        color: #0f172a;
        text-align: left;
    }

    .settings-row:last-child { border-bottom: none; }
    .settings-row:active { background: #f8fafc; }
    .settings-row.danger { color: #dc2626; }
</style>
