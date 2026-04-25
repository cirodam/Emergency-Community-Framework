<script lang="ts">
    interface Props { message: string; }
    let { message }: Props = $props();
</script>

{#if message}
    <div class="error-banner" role="alert">
        <span>{message}</span>
    </div>
{/if}

<style>
    .error-banner {
        background: #fef2f2;
        border: 1px solid #fca5a5;
        border-radius: 8px;
        color: #b91c1c;
        font-size: 0.9rem;
        padding: 0.75rem 1rem;
        margin-bottom: 1rem;
        text-align: center;
    }
</style>
