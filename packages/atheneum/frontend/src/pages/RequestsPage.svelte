<script lang="ts">
    import { onMount } from "svelte";
    import { listRequests, createRequest, upvoteRequest, removeUpvote } from "../lib/api.js";
    import type { ClassRequest } from "../lib/api.js";
    import { session } from "../lib/session.js";

    let requests    = $state<ClassRequest[]>([]);
    let loading     = $state(true);
    let showForm    = $state(false);
    let newTitle    = $state("");
    let newDesc     = $state("");
    let submitting  = $state(false);
    let error       = $state("");

    const me = $derived($session?.personId ?? "");

    onMount(async () => {
        requests = await listRequests();
        loading  = false;
    });

    async function submit() {
        submitting = true;
        error      = "";
        try {
            const r = await createRequest({ title: newTitle, description: newDesc });
            requests = [r, ...requests];
            showForm = false;
            newTitle = "";
            newDesc  = "";
        } catch (e) {
            error = (e as Error).message;
        } finally {
            submitting = false;
        }
    }

    async function toggleUpvote(r: ClassRequest) {
        if (r.upvoteIds.includes(me)) {
            const updated = await removeUpvote(r.id);
            requests = requests.map(x => x.id === r.id ? updated : x);
        } else {
            const updated = await upvoteRequest(r.id);
            requests = requests.map(x => x.id === r.id ? updated : x);
        }
    }
</script>

<div class="page">
    <div class="header-row">
        <h1>Session Requests</h1>
        <button class="btn primary" onclick={() => showForm = !showForm}>
            {showForm ? "Cancel" : "+ Request a session"}
        </button>
    </div>
    <p class="muted">Upvote things you want to learn. Anyone can pick up an open request and propose a session from it.</p>

    {#if showForm}
        <form class="form" onsubmit={(e) => { e.preventDefault(); submit(); }}>
            <label>
                What do you want to learn?
                <input type="text" bind:value={newTitle} required />
            </label>
            <label>
                Why would this be useful to the community?
                <textarea bind:value={newDesc} rows={3} required></textarea>
            </label>
            {#if error}<p class="error">{error}</p>{/if}
            <button class="btn primary" type="submit" disabled={submitting}>{submitting ? "Submitting…" : "Submit request"}</button>
        </form>
    {/if}

    {#if loading}
        <p class="muted">Loading…</p>
    {:else if requests.length === 0}
        <p class="muted">No requests yet. Be the first!</p>
    {:else}
        <ul class="list">
            {#each requests as r (r.id)}
                <li class="item" class:claimed={r.status !== "open"}>
                    <button
                        class="upvote"
                        class:voted={r.upvoteIds.includes(me)}
                        onclick={() => toggleUpvote(r)}
                        disabled={r.status !== "open"}
                        aria-label="Upvote"
                    >
                        ▲ {r.upvoteIds.length}
                    </button>
                    <div class="content">
                        <div class="item-title">{r.title}</div>
                        <div class="item-desc">{r.description}</div>
                        <div class="item-meta">
                            Requested by @{r.requesterHandle}
                            {#if r.status === "claimed"}· claimed by @{r.claimedBy}{/if}
                            {#if r.status === "fulfilled"}· fulfilled ✓{/if}
                        </div>
                    </div>
                </li>
            {/each}
        </ul>
    {/if}
</div>

<style>
    .page { max-width: 700px; }
    .header-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem; }
    h1 { margin: 0; }
    .muted { color: #6b7280; margin-bottom: 1.5rem; }
    .form { background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 1.25rem; margin-bottom: 1.5rem; display: flex; flex-direction: column; gap: 0.75rem; }
    label { display: flex; flex-direction: column; gap: 0.3rem; font-weight: 500; font-size: 0.9rem; color: #374151; }
    input, textarea { padding: 0.5rem 0.75rem; border: 1px solid #d1d5db; border-radius: 6px; font-size: 0.9rem; font-family: inherit; }
    textarea { resize: vertical; }
    .error { color: #dc2626; font-size: 0.9rem; }
    .list { list-style: none; padding: 0; display: flex; flex-direction: column; gap: 0.75rem; }
    .item { display: flex; gap: 1rem; background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 1rem; }
    .item.claimed { opacity: 0.7; }
    .upvote {
        display: flex; flex-direction: column; align-items: center;
        background: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 6px;
        padding: 0.4rem 0.6rem; cursor: pointer; font-size: 0.85rem; font-weight: 600;
        color: #374151; min-width: 48px; gap: 0.2rem; flex-shrink: 0;
    }
    .upvote.voted { background: #dbeafe; border-color: #93c5fd; color: #1d4ed8; }
    .upvote:disabled { cursor: default; opacity: 0.5; }
    .content { display: flex; flex-direction: column; gap: 0.3rem; }
    .item-title { font-weight: 600; }
    .item-desc { font-size: 0.9rem; color: #374151; }
    .item-meta { font-size: 0.8rem; color: #9ca3af; }
    .btn { padding: 0.5rem 1rem; border-radius: 6px; border: none; font-size: 0.9rem; cursor: pointer; font-weight: 600; width: fit-content; }
    .btn.primary { background: #3b82f6; color: #fff; }
    .btn:disabled { opacity: 0.6; cursor: default; }
</style>
