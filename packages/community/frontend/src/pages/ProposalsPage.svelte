<script lang="ts">
    import {
        listProposals, createProposal, voteOnProposal, withdrawProposal,
        listPools, getConstitution,
        PROPOSAL_TYPES, PROPOSAL_TYPE_LABELS,
    } from "../lib/api.js";
    import type { ProposalDto, ProposalType, PoolDto } from "../lib/api.js";
    import { session } from "../lib/session.js";

    interface ConstitutionParam {
        key:         string;
        value:       number | boolean;
        authority:   string;
        description: string;
        constraints?: { min?: number; max?: number };
    }

    // ── State ─────────────────────────────────────────────────────────────────
    const FILTER_OPTIONS = ["open", "passed", "rejected", "expired", "withdrawn", "all"] as const;
    type FilterOption = typeof FILTER_OPTIONS[number];

    let proposals: ProposalDto[]        = $state([]);
    let pools:     PoolDto[]            = $state([]);
    let mutableParams: ConstitutionParam[] = $state([]); // for amendment form
    let loading    = $state(true);
    let error      = $state("");
    let filter     = $state<FilterOption>("open");
    let expanded   = $state<string | null>(null); // proposal id detail view

    // Create form
    let showCreate  = $state(false);
    let creating    = $state(false);
    let createError = $state("");
    let form = $state({
        type:            "other" as ProposalType,
        poolId:          "",
        title:           "",
        description:     "",
        approvalsNeeded: 3,
        ttlDays:         14,
        // amendment-specific
        amendParameter:  "",
        amendNewValue:   "",
    });

    // Derived: currently-selected parameter metadata (for amendment form hints)
    const selectedParam = $derived(
        mutableParams.find(p => p.key === form.amendParameter) ?? null
    );

    // When type changes to constitution-amendment, load mutable params if not loaded
    $effect(() => {
        if (form.type === "constitution-amendment" && mutableParams.length === 0) {
            getConstitution().then(doc => {
                mutableParams = Object.entries(doc.parameters)
                    .filter(([, p]) => p.authority !== "immutable")
                    .map(([key, p]) => ({ key, ...p }))
                    .sort((a, b) => a.key.localeCompare(b.key));
                if (mutableParams.length > 0 && !form.amendParameter) {
                    form.amendParameter = mutableParams[0].key;
                    form.amendNewValue  = String(mutableParams[0].value);
                }
            }).catch(() => {});
        }
    });

    // When the selected parameter changes, pre-fill current value
    $effect(() => {
        const p = mutableParams.find(mp => mp.key === form.amendParameter);
        if (p) form.amendNewValue = String(p.value);
    });

    // Vote state per proposal
    let votingId    = $state<string | null>(null);
    let voteComment = $state("");
    let voteError   = $state("");

    // ── Data ──────────────────────────────────────────────────────────────────
    async function load() {
        loading = true; error = "";
        try {
            const [p, pl] = await Promise.all([
                listProposals(filter === "all" ? {} : { status: filter }),
                listPools(),
            ]);
            proposals = p;
            pools     = pl;
            if (!form.poolId && pl.length > 0) form.poolId = pl[0].id;
        } catch (e) {
            error = e instanceof Error ? e.message : "Failed to load";
        } finally {
            loading = false;
        }
    }

    $effect(() => { filter; load(); });

    // ── Create ────────────────────────────────────────────────────────────────
    async function submit() {
        createError = "";
        if (!form.title.trim())       { createError = "Title is required."; return; }
        if (!form.description.trim()) { createError = "Description is required."; return; }
        if (!form.poolId)             { createError = "Select a pool."; return; }

        // Build type-specific payload
        let payload: Record<string, unknown> = {};
        if (form.type === "constitution-amendment") {
            if (!form.amendParameter) { createError = "Select a parameter to amend."; return; }
            const param = mutableParams.find(p => p.key === form.amendParameter);
            if (!param) { createError = "Unknown parameter."; return; }
            const rawVal = form.amendNewValue.trim();
            const newValue: number | boolean =
                typeof param.value === "boolean"
                    ? rawVal === "true"
                    : Number(rawVal);
            if (typeof param.value === "number" && isNaN(newValue as number)) {
                createError = "New value must be a number."; return;
            }
            payload = { parameter: form.amendParameter, newValue };
        }
        creating = true;
        try {
            const p = await createProposal({
                type:            form.type,
                poolId:          form.poolId,
                title:           form.title.trim(),
                description:     form.description.trim(),
                payload,
                approvalsNeeded: form.approvalsNeeded,
                ttlDays:         form.ttlDays,
            });
            proposals = [p, ...proposals];
            showCreate = false;
            form = { type: "other", poolId: form.poolId, title: "", description: "", approvalsNeeded: 3, ttlDays: 14, amendParameter: "", amendNewValue: "" };
        } catch (e) {
            createError = e instanceof Error ? e.message : "Failed to create";
        } finally {
            creating = false;
        }
    }

    // ── Vote ──────────────────────────────────────────────────────────────────
    async function castVote(id: string, vote: "approve" | "reject" | "abstain") {
        voteError = "";
        try {
            const updated = await voteOnProposal(id, vote, voteComment);
            proposals = proposals.map(p => p.id === id ? updated : p);
            votingId    = null;
            voteComment = "";
        } catch (e) {
            voteError = e instanceof Error ? e.message : "Failed to vote";
        }
    }

    // ── Withdraw ──────────────────────────────────────────────────────────────
    async function withdraw(id: string) {
        if (!confirm("Withdraw this proposal? This cannot be undone.")) return;
        try {
            const updated = await withdrawProposal(id);
            proposals = proposals.map(p => p.id === id ? updated : p);
        } catch (e) {
            alert(e instanceof Error ? e.message : "Failed to withdraw");
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    function poolName(id: string): string {
        return pools.find(p => p.id === id)?.name ?? id;
    }

    function daysLeft(expiresAt: string): string {
        const diff = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86_400_000);
        if (diff <= 0) return "expired";
        return `${diff}d left`;
    }

    function statusClass(status: string): string {
        return {
            open:      "badge-open",
            passed:    "badge-passed",
            rejected:  "badge-rejected",
            expired:   "badge-expired",
            withdrawn: "badge-withdrawn",
        }[status] ?? "badge-open";
    }

    const me = $derived($session?.personId ?? "");
</script>

<div class="page">
    <div class="page-header">
        <div>
            <h2 class="page-title">Proposals</h2>
            <p class="page-subtitle">Collective decisions requiring pool approval.</p>
        </div>
        <button class="new-btn" onclick={() => { showCreate = !showCreate; createError = ""; }}>
            {showCreate ? "✕" : "+ New"}
        </button>
    </div>

    <!-- Create form -->
    {#if showCreate}
        <form class="create-form" onsubmit={(e) => { e.preventDefault(); submit(); }}>
            <h3 class="form-title">Raise a proposal</h3>

            <div class="field">
                <label for="ptype">Type</label>
                <select id="ptype" bind:value={form.type}>
                    {#each PROPOSAL_TYPES as t}
                        <option value={t}>{PROPOSAL_TYPE_LABELS[t]}</option>
                    {/each}
                </select>
            </div>

            <div class="field">
                <label for="ppool">Voting pool</label>
                <select id="ppool" bind:value={form.poolId}>
                    {#each pools as p}
                        <option value={p.id}>{p.name}</option>
                    {/each}
                </select>
            </div>

            <div class="field">
                <label for="ptitle">Title</label>
                <input id="ptitle" type="text" bind:value={form.title} placeholder="Brief summary of the proposal" />
            </div>

            <div class="field">
                <label for="pdesc">Description</label>
                <textarea id="pdesc" bind:value={form.description} rows="4"
                    placeholder="Explain the reason, expected impact, and any relevant details."></textarea>
            </div>

            <!-- Amendment payload fields -->
            {#if form.type === "constitution-amendment"}
                <div class="amendment-box">
                    <div class="field">
                        <label for="pamend-param">Parameter to change</label>
                        {#if mutableParams.length === 0}
                            <p class="field-hint loading-hint">Loading parameters…</p>
                        {:else}
                            <select id="pamend-param" bind:value={form.amendParameter}>
                                {#each mutableParams as mp}
                                    <option value={mp.key}>{mp.key} <span>({mp.authority})</span></option>
                                {/each}
                            </select>
                        {/if}
                        {#if selectedParam}
                            <span class="param-desc">{selectedParam.description}</span>
                            <span class="param-current">Current value: <strong>{selectedParam.value}</strong>
                                {#if selectedParam.constraints?.min !== undefined || selectedParam.constraints?.max !== undefined}
                                    · allowed: {selectedParam.constraints?.min ?? "—"} – {selectedParam.constraints?.max ?? "—"}
                                {/if}
                            </span>
                        {/if}
                    </div>
                    <div class="field">
                        <label for="pamend-val">New value</label>
                        {#if selectedParam && typeof selectedParam.value === "boolean"}
                            <select id="pamend-val" bind:value={form.amendNewValue}>
                                <option value="true">true</option>
                                <option value="false">false</option>
                            </select>
                        {:else}
                            <input id="pamend-val" type="number" bind:value={form.amendNewValue}
                                min={selectedParam?.constraints?.min}
                                max={selectedParam?.constraints?.max}
                                step="any" />
                        {/if}
                    </div>
                </div>
            {/if}

            <div class="field-row">
                <div class="field">
                    <label for="papp">Approvals needed</label>
                    <input id="papp" type="number" min="1" bind:value={form.approvalsNeeded} />
                </div>
                <div class="field">
                    <label for="pttl">Open for (days)</label>
                    <input id="pttl" type="number" min="1" max="90" bind:value={form.ttlDays} />
                </div>
            </div>

            {#if createError}
                <p class="form-error">{createError}</p>
            {/if}

            <button class="submit-btn" type="submit" disabled={creating}>
                {creating ? "Submitting…" : "Submit proposal"}
            </button>
        </form>
    {/if}

    <!-- Status filter tabs -->
    <div class="filter-bar">
        {#each FILTER_OPTIONS as s}
            <button class:active={filter === s} onclick={() => { filter = s; expanded = null; }}>
                {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
        {/each}
    </div>

    {#if loading && proposals.length === 0}
        <div class="skeleton"></div>
        <div class="skeleton short"></div>
        <div class="skeleton"></div>
    {:else if error}
        <div class="error-msg">{error}</div>
    {:else if proposals.length === 0}
        <div class="empty-msg">No {filter === "all" ? "" : filter + " "}proposals.</div>
    {:else}
        <div class="list">
            {#each proposals as p (p.id)}
                <div class="card {expanded === p.id ? 'expanded' : ''}">
                    <!-- Header row -->
                    <button class="card-header" onclick={() => { expanded = expanded === p.id ? null : p.id; voteError = ""; }}>
                        <div class="card-left">
                            <span class="type-tag">{PROPOSAL_TYPE_LABELS[p.type]}</span>
                            <span class="card-title">{p.title}</span>
                            <span class="card-meta">by @{p.proposerHandle} · {poolName(p.poolId)}</span>
                        </div>
                        <div class="card-right">
                            <span class="badge {statusClass(p.status)}">{p.status}</span>
                            {#if p.status === "open"}
                                <span class="ttl">{daysLeft(p.expiresAt)}</span>
                                <span class="tally">{p.approvalCount}/{p.approvalsNeeded} ✓</span>
                            {/if}
                            <span class="chevron">{expanded === p.id ? "▲" : "▼"}</span>
                        </div>
                    </button>

                    <!-- Detail panel -->
                    {#if expanded === p.id}
                        <div class="detail">
                            <p class="description">{p.description}</p>

                            <!-- Amendment summary -->
                            {#if p.type === "constitution-amendment" && p.payload.parameter}
                                <div class="amendment-summary">
                                    <span class="amend-label">Parameter:</span> <code>{p.payload.parameter}</code>
                                    &nbsp;→&nbsp;
                                    <span class="amend-label">New value:</span> <strong>{p.payload.newValue}</strong>
                                </div>
                            {/if}

                            {#if p.outcomeNote}
                                <p class="outcome-note">{p.outcomeNote}</p>
                            {/if}

                            <!-- Vote tally -->
                            <div class="tally-row">
                                <span class="tally-item approve">✓ {p.approvalCount} approve</span>
                                <span class="tally-item reject">✗ {p.rejectionCount} reject</span>
                                <span class="tally-item abstain">— {p.votes.filter(v => v.vote === "abstain").length} abstain</span>
                            </div>

                            <!-- Votes list -->
                            {#if p.votes.length > 0}
                                <ul class="votes-list">
                                    {#each p.votes as v}
                                        <li class="vote-item {v.vote}">
                                            <span class="vote-handle">@{v.handle}</span>
                                            <span class="vote-label">{v.vote}</span>
                                            {#if v.comment}<span class="vote-comment">{v.comment}</span>{/if}
                                        </li>
                                    {/each}
                                </ul>
                            {/if}

                            <!-- Voting controls (open proposals, not already voted) -->
                            {#if p.status === "open" && me && !p.votes.some(v => v.personId === me)}
                                {#if votingId === p.id}
                                    <div class="vote-form">
                                        <label for="vcom-{p.id}" class="vote-label-text">Comment <span class="field-hint">optional</span></label>
                                        <textarea id="vcom-{p.id}" bind:value={voteComment} rows="2" placeholder="Why are you voting this way?"></textarea>
                                        <div class="vote-buttons">
                                            <button class="vote-btn approve" onclick={() => castVote(p.id, "approve")}>✓ Approve</button>
                                            <button class="vote-btn reject"  onclick={() => castVote(p.id, "reject")}>✗ Reject</button>
                                            <button class="vote-btn abstain" onclick={() => castVote(p.id, "abstain")}>— Abstain</button>
                                            <button class="vote-btn cancel"  onclick={() => { votingId = null; voteComment = ""; voteError = ""; }}>Cancel</button>
                                        </div>
                                        {#if voteError}<p class="form-error">{voteError}</p>{/if}
                                    </div>
                                {:else}
                                    <button class="cast-vote-btn" onclick={() => { votingId = p.id; voteComment = ""; voteError = ""; }}>Cast vote</button>
                                {/if}
                            {:else if p.votes.some(v => v.personId === me)}
                                <p class="already-voted">You have already voted on this proposal.</p>
                            {/if}

                            <!-- Withdraw (proposer only, open proposals) -->
                            {#if p.status === "open" && p.proposerId === me}
                                <button class="withdraw-btn" onclick={() => withdraw(p.id)}>Withdraw proposal</button>
                            {/if}

                            <p class="meta-footer">
                                Raised {new Date(p.createdAt).toLocaleDateString()} ·
                                Expires {new Date(p.expiresAt).toLocaleDateString()}
                                {#if p.executedAt} · Executed {new Date(p.executedAt).toLocaleDateString()}{/if}
                            </p>
                        </div>
                    {/if}
                </div>
            {/each}
        </div>
    {/if}
</div>

<style>
.page { max-width: 700px; margin: 0 auto; padding: 1rem; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.25rem; }
.page-title  { font-size: 1.4rem; font-weight: 700; margin: 0 0 0.15rem; }
.page-subtitle { font-size: 0.85rem; color: #666; margin: 0; }
.new-btn { background: #333; color: #fff; border: none; border-radius: 6px; padding: 0.5rem 1rem; cursor: pointer; font-size: 0.9rem; }
.new-btn:hover { background: #555; }

/* Create form */
.create-form { background: #f9f9f9; border: 1px solid #e0e0e0; border-radius: 10px; padding: 1.25rem; margin-bottom: 1.25rem; }
.form-title  { font-size: 1rem; font-weight: 600; margin: 0 0 1rem; }
.field { display: flex; flex-direction: column; gap: 0.3rem; margin-bottom: 0.85rem; }
.field-row { display: flex; gap: 1rem; }
.field-row .field { flex: 1; }
.field label { font-size: 0.82rem; font-weight: 600; color: #444; }
.field input, .field textarea, .field select { border: 1px solid #ccc; border-radius: 6px; padding: 0.5rem 0.65rem; font-size: 0.9rem; background: #fff; }
.field-hint { font-weight: 400; color: #888; font-size: 0.78rem; }
.form-error  { color: #c00; font-size: 0.85rem; margin: 0.25rem 0 0; }
.submit-btn  { background: #333; color: #fff; border: none; border-radius: 6px; padding: 0.6rem 1.2rem; cursor: pointer; font-size: 0.9rem; margin-top: 0.5rem; }
.submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }

/* Filter */
.filter-bar { display: flex; gap: 0.4rem; flex-wrap: wrap; margin-bottom: 1rem; }
.filter-bar button { background: #f0f0f0; color: #333; border: 1px solid #ddd; border-radius: 16px; padding: 0.3rem 0.75rem; font-size: 0.8rem; cursor: pointer; }
.filter-bar button.active { background: #333; color: #fff; border-color: #333; }

/* Cards */
.list { display: flex; flex-direction: column; gap: 0.75rem; }
.card { border: 1px solid #e0e0e0; border-radius: 10px; overflow: hidden; background: #fff; }
.card.expanded { border-color: #333; }
.card-header { display: flex; justify-content: space-between; align-items: center; padding: 0.85rem 1rem; width: 100%; background: none; border: none; cursor: pointer; text-align: left; gap: 0.75rem; }
.card-header:hover { background: #fafafa; }
.card-left  { display: flex; flex-direction: column; gap: 0.2rem; flex: 1; min-width: 0; }
.card-right { display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0; }
.type-tag   { font-size: 0.72rem; font-weight: 600; color: #666; text-transform: uppercase; letter-spacing: 0.05em; }
.card-title { font-size: 0.95rem; font-weight: 600; color: #222; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.card-meta  { font-size: 0.78rem; color: #888; }
.chevron    { font-size: 0.7rem; color: #888; }
.ttl        { font-size: 0.78rem; color: #888; }
.tally      { font-size: 0.78rem; color: #555; font-weight: 600; }

/* Badges */
.badge { font-size: 0.72rem; font-weight: 700; border-radius: 10px; padding: 0.15rem 0.55rem; text-transform: uppercase; letter-spacing: 0.04em; }
.badge-open      { background: #e8f4fd; color: #1565c0; }
.badge-passed    { background: #e8f5e9; color: #2e7d32; }
.badge-rejected  { background: #fce4e4; color: #c62828; }
.badge-expired   { background: #f5f5f5; color: #757575; }
.badge-withdrawn { background: #fff8e1; color: #f57f17; }

/* Detail */
.detail { border-top: 1px solid #eee; padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem; }
.description  { font-size: 0.9rem; color: #333; margin: 0; white-space: pre-wrap; }
.outcome-note { font-size: 0.85rem; color: #555; background: #fffde7; border: 1px solid #ffe082; border-radius: 6px; padding: 0.5rem 0.75rem; margin: 0; }

/* Tally row */
.tally-row  { display: flex; gap: 1rem; flex-wrap: wrap; }
.tally-item { font-size: 0.82rem; font-weight: 600; }
.tally-item.approve { color: #2e7d32; }
.tally-item.reject  { color: #c62828; }
.tally-item.abstain { color: #888; }

/* Votes list */
.votes-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.35rem; }
.vote-item  { display: flex; gap: 0.5rem; align-items: baseline; font-size: 0.82rem; }
.vote-item.approve .vote-label { color: #2e7d32; font-weight: 600; }
.vote-item.reject  .vote-label { color: #c62828; font-weight: 600; }
.vote-item.abstain .vote-label { color: #888; }
.vote-handle  { font-weight: 600; color: #333; }
.vote-comment { color: #666; font-style: italic; }

/* Vote form */
.vote-form     { display: flex; flex-direction: column; gap: 0.5rem; background: #f9f9f9; border: 1px solid #e0e0e0; border-radius: 8px; padding: 0.85rem; }
.vote-label-text { font-size: 0.82rem; font-weight: 600; color: #444; }
.vote-form textarea { border: 1px solid #ccc; border-radius: 6px; padding: 0.45rem 0.6rem; font-size: 0.88rem; }
.vote-buttons  { display: flex; gap: 0.5rem; flex-wrap: wrap; }
.vote-btn      { border: none; border-radius: 6px; padding: 0.45rem 0.85rem; font-size: 0.85rem; cursor: pointer; font-weight: 600; }
.vote-btn.approve { background: #2e7d32; color: #fff; }
.vote-btn.reject  { background: #c62828; color: #fff; }
.vote-btn.abstain { background: #757575; color: #fff; }
.vote-btn.cancel  { background: #f0f0f0; color: #333; }

.cast-vote-btn { background: #1565c0; color: #fff; border: none; border-radius: 6px; padding: 0.45rem 1rem; font-size: 0.85rem; cursor: pointer; font-weight: 600; align-self: flex-start; }
.already-voted { font-size: 0.82rem; color: #888; font-style: italic; margin: 0; }
.withdraw-btn  { background: none; border: 1px solid #ccc; border-radius: 6px; padding: 0.35rem 0.75rem; font-size: 0.8rem; color: #888; cursor: pointer; align-self: flex-start; }
.withdraw-btn:hover { background: #fff8e1; border-color: #e0a800; color: #b77800; }

.meta-footer { font-size: 0.75rem; color: #aaa; margin: 0; }

/* Amendment form box */
.amendment-box  { background: #f0f4ff; border: 1px solid #c5d4f5; border-radius: 8px; padding: 0.85rem; margin-bottom: 0.85rem; display: flex; flex-direction: column; gap: 0.65rem; }
.param-desc     { font-size: 0.78rem; color: #555; font-style: italic; margin-top: 0.2rem; }
.param-current  { font-size: 0.78rem; color: #444; }
.loading-hint   { font-size: 0.82rem; color: #888; margin: 0; }

/* Amendment summary in card detail */
.amendment-summary { font-size: 0.85rem; background: #f0f4ff; border: 1px solid #c5d4f5; border-radius: 6px; padding: 0.5rem 0.75rem; }
.amend-label { color: #666; font-weight: 600; }
.amendment-summary code { background: #dbe6ff; padding: 0.1rem 0.35rem; border-radius: 4px; font-size: 0.82rem; }

/* Loading / empty */
.skeleton { height: 70px; background: #f0f0f0; border-radius: 10px; margin-bottom: 0.75rem; animation: pulse 1.2s infinite; }
.skeleton.short { height: 48px; }
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
.error-msg { color: #c00; font-size: 0.9rem; padding: 0.75rem; background: #fce4e4; border-radius: 8px; }
.empty-msg { color: #888; font-size: 0.9rem; text-align: center; padding: 2rem; }
</style>
