<script lang="ts">
    import { getConstitution, listPersons, listPools, listNominations } from "../lib/api.js";
    import type { ConstitutionDocument, PersonDto, PoolDto, NominationDto } from "../lib/api.js";

    let {
        kind,
        payload = $bindable<Record<string, unknown>>({}),
    }: {
        kind: string;
        payload: Record<string, unknown>;
    } = $props();

    // Lazy-loaded reference data
    let constitution = $state<ConstitutionDocument | null>(null);
    let persons      = $state<PersonDto[]>([]);
    let pools        = $state<PoolDto[]>([]);
    let nominations  = $state<NominationDto[]>([]);

    $effect(() => {
        if (kind === "amend-constitution" && !constitution) {
            getConstitution().then(c => { constitution = c; }).catch(() => {});
        } else if ((kind === "suspend-member" || kind === "reinstate-member") && !persons.length) {
            listPersons().then(p => { persons = p; }).catch(() => {});
        } else if (kind === "remove-role" && !pools.length) {
            listPools().then(p => { pools = p; }).catch(() => {});
        } else if (kind === "accept-nomination" && !nominations.length) {
            listNominations().then(ns => { nominations = ns.filter(n => n.status === "pending"); }).catch(() => {});
        }
    });

    // Per-kind field state
    let amendParam       = $state("");
    let amendBool        = $state("true");
    let amendNum         = $state("");
    let selectedPersonId = $state("");
    let roleName         = $state("");
    let roleDesc         = $state("");
    let selectedPoolId   = $state("");
    let nominationId     = $state("");

    const amendParamInfo = $derived(
        constitution && amendParam ? (constitution.parameters[amendParam] ?? null) : null
    );
    const amendIsBoolean = $derived(amendParamInfo ? typeof amendParamInfo.value === "boolean" : false);

    // Sync local fields → payload
    $effect(() => {
        if (kind === "amend-constitution") {
            if (!amendParam || !amendParamInfo) { payload = {}; return; }
            if (amendIsBoolean) {
                payload = { parameter: amendParam, newValue: amendBool === "true" };
            } else {
                const n = Number(amendNum);
                if (!amendNum || isNaN(n)) { payload = {}; return; }
                payload = { parameter: amendParam, newValue: n };
            }
        } else if (kind === "suspend-member" || kind === "reinstate-member") {
            payload = selectedPersonId ? { personId: selectedPersonId } : {};
        } else if (kind === "add-role") {
            const name = roleName.trim();
            const desc = roleDesc.trim();
            payload = name ? { name, ...(desc ? { description: desc } : {}) } : {};
        } else if (kind === "remove-role") {
            payload = selectedPoolId ? { poolId: selectedPoolId } : {};
        } else if (kind === "accept-nomination") {
            payload = nominationId ? { nominationId } : {};
        } else {
            payload = {};
        }
    });
</script>

{#if kind === "amend-constitution"}
    {#if !constitution}
        <p class="hint">Loading constitution…</p>
    {:else}
        <select class="input select" bind:value={amendParam}>
            <option value="">— choose parameter —</option>
            {#each Object.entries(constitution.parameters) as [key, param]}
                <option value={key}>{param.description} ({key})</option>
            {/each}
        </select>
        {#if amendParamInfo}
            <p class="hint">
                Current: <strong>{String(amendParamInfo.value)}</strong>
                {#if amendParamInfo.constraints?.min !== undefined || amendParamInfo.constraints?.max !== undefined}
                    &nbsp;·&nbsp; range: {amendParamInfo.constraints?.min ?? "–"} – {amendParamInfo.constraints?.max ?? "–"}
                {/if}
            </p>
            {#if amendIsBoolean}
                <select class="input select" bind:value={amendBool}>
                    <option value="true">true</option>
                    <option value="false">false</option>
                </select>
            {:else}
                <input
                    class="input"
                    type="number"
                    placeholder="New value"
                    bind:value={amendNum}
                    min={amendParamInfo.constraints?.min}
                    max={amendParamInfo.constraints?.max}
                />
            {/if}
        {/if}
    {/if}
{:else if kind === "suspend-member" || kind === "reinstate-member"}
    {#if !persons.length}
        <p class="hint">Loading members…</p>
    {:else}
        <select class="input select" bind:value={selectedPersonId}>
            <option value="">— choose member —</option>
            {#each persons.filter(p => kind === "suspend-member" ? !p.disabled : p.disabled) as p (p.id)}
                <option value={p.id}>{p.firstName} {p.lastName}{p.handle ? ` (@${p.handle})` : ""}</option>
            {/each}
        </select>
    {/if}
{:else if kind === "add-role"}
    <input class="input" type="text" placeholder="Pool name" bind:value={roleName} />
    <textarea class="input textarea" placeholder="Description (optional)" bind:value={roleDesc} rows="2"></textarea>
{:else if kind === "remove-role"}
    {#if !pools.length}
        <p class="hint">Loading pools…</p>
    {:else}
        <select class="input select" bind:value={selectedPoolId}>
            <option value="">— choose pool —</option>
            {#each pools as p (p.id)}
                <option value={p.id}>{p.name}</option>
            {/each}
        </select>
    {/if}
{:else if kind === "accept-nomination"}
    {#if !nominations.length}
        <p class="hint">No pending nominations.</p>
    {:else}
        <select class="input select" bind:value={nominationId}>
            <option value="">— choose nomination —</option>
            {#each nominations as n (n.id)}
                <option value={n.id}>{n.poolName ?? n.roleId} — {n.nomineeId}</option>
            {/each}
        </select>
    {/if}
{/if}

<style>
    .input {
        width: 100%;
        padding: 0.45rem 0.65rem;
        border: 1px solid #cbd5e1;
        border-radius: 0.5rem;
        font-size: 0.875rem;
        background: #fff;
        color: #0f172a;
        box-sizing: border-box;
    }
    .input:focus { outline: none; border-color: #16a34a; box-shadow: 0 0 0 2px #bbf7d0; }
    .select { cursor: pointer; }
    .textarea { resize: vertical; min-height: 3.5rem; font-family: inherit; }
    .hint { font-size: 0.78rem; color: #64748b; margin: 0; }
</style>
