<script lang="ts">
    import { getConstitution, listPersons, listPools, listNominations, listBylaws } from "../lib/api.js";
    import type { ConstitutionDocument, PersonDto, PoolDto, NominationDto, BylawDto } from "../lib/api.js";

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
    let bylaws       = $state<BylawDto[]>([]);

    $effect(() => {
        if (kind === "amend-constitution" && !constitution) {
            getConstitution().then(c => { constitution = c; }).catch(() => {});
        } else if ((kind === "suspend-member" || kind === "reinstate-member") && !persons.length) {
            listPersons().then(p => { persons = p; }).catch(() => {});
        } else if (kind === "remove-role" && !pools.length) {
            listPools().then(p => { pools = p; }).catch(() => {});
        } else if (kind === "accept-nomination" && !nominations.length) {
            listNominations().then(ns => { nominations = ns.filter(n => n.status === "pending"); }).catch(() => {});
        } else if ((kind === "amend-bylaw") && !bylaws.length) {
            listBylaws().then(b => { bylaws = b; }).catch(() => {});
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

    // create-bylaw / amend-bylaw fields
    let bylawTitle    = $state("");
    let bylawPreamble = $state("");
    let bylawId       = $state("");

    // schedule-community-event fields
    let evtTitle            = $state("");
    let evtDate             = $state("");
    let evtStartTime        = $state("09:00");
    let evtEndTime          = $state("");
    let evtAllDay           = $state(false);
    let evtLocation         = $state("");
    let evtDescription      = $state("");
    let evtRecurrence       = $state("");
    let evtRecurrenceEndsAt = $state("");

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
        } else if (kind === "schedule-community-event") {
            if (!evtTitle.trim() || !evtDate) { payload = {}; return; }
            const startAt = evtAllDay
                ? `${evtDate}T00:00:00.000Z`
                : new Date(`${evtDate}T${evtStartTime}:00`).toISOString();
            const endAt = (!evtAllDay && evtEndTime)
                ? new Date(`${evtDate}T${evtEndTime}:00`).toISOString()
                : null;
            const recurrenceEndsAt = evtRecurrenceEndsAt
                ? new Date(evtRecurrenceEndsAt + "T23:59:59").toISOString()
                : null;
            payload = {
                title:       evtTitle.trim(),
                startAt,
                ...(endAt            ? { endAt }            : {}),
                ...(evtAllDay        ? { allDay: true }      : {}),
                ...(evtLocation.trim()     ? { location:    evtLocation.trim() }     : {}),
                ...(evtDescription.trim()  ? { description: evtDescription.trim() }  : {}),
                ...(evtRecurrence          ? { recurrence:  evtRecurrence }           : {}),
                ...(recurrenceEndsAt       ? { recurrenceEndsAt }                     : {}),
            };
        } else if (kind === "create-bylaw") {
            const title = bylawTitle.trim();
            payload = title
                ? { title, ...(bylawPreamble.trim() ? { preamble: bylawPreamble.trim() } : {}) }
                : {};
        } else if (kind === "amend-bylaw") {
            payload = bylawId
                ? { bylawId, ...(bylawTitle.trim() ? { title: bylawTitle.trim() } : {}), ...(bylawPreamble.trim() ? { preamble: bylawPreamble.trim() } : {}) }
                : {};
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
{:else if kind === "schedule-community-event"}
    <input class="input" type="text" placeholder="Event title *" bind:value={evtTitle} />

    <div class="row">
        <label class="field">
            <span class="field-label">Date *</span>
            <input class="input" type="date" bind:value={evtDate} />
        </label>
        <label class="field field-check">
            <input type="checkbox" bind:checked={evtAllDay} />
            <span class="field-label">All day</span>
        </label>
    </div>

    {#if !evtAllDay}
        <div class="row">
            <label class="field">
                <span class="field-label">Start time</span>
                <input class="input" type="time" bind:value={evtStartTime} />
            </label>
            <label class="field">
                <span class="field-label">End time</span>
                <input class="input" type="time" bind:value={evtEndTime} />
            </label>
        </div>
    {/if}

    <input class="input" type="text" placeholder="Location (optional)" bind:value={evtLocation} />
    <textarea class="input textarea" placeholder="Description (optional)" bind:value={evtDescription} rows="2"></textarea>

    <div class="row">
        <label class="field">
            <span class="field-label">Repeats</span>
            <select class="input select" bind:value={evtRecurrence}>
                <option value="">One-time</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="biweekly">Every 2 weeks</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
            </select>
        </label>
        {#if evtRecurrence}
            <label class="field">
                <span class="field-label">Ends on</span>
                <input class="input" type="date" bind:value={evtRecurrenceEndsAt} />
            </label>
        {/if}
    </div>
{:else if kind === "create-bylaw"}
    <input class="input" type="text" placeholder="Bylaw title *" bind:value={bylawTitle} />
    <textarea class="input textarea" placeholder="Preamble (optional)" bind:value={bylawPreamble} rows="3"></textarea>
{:else if kind === "amend-bylaw"}
    {#if !bylaws.length}
        <p class="hint">Loading bylaws…</p>
    {:else}
        <select class="input select" bind:value={bylawId} onchange={() => { bylawTitle = ""; bylawPreamble = ""; }}>
            <option value="">— choose bylaw —</option>
            {#each bylaws as b (b.id)}
                <option value={b.id}>{b.title}{b.scope ? ` [pool: ${b.scope}]` : ""}</option>
            {/each}
        </select>
    {/if}
    {#if bylawId}
        <input class="input" type="text" placeholder="New title (leave blank to keep current)" bind:value={bylawTitle} />
        <textarea class="input textarea" placeholder="New preamble (leave blank to keep current)" bind:value={bylawPreamble} rows="3"></textarea>
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
    .row { display: flex; gap: 0.5rem; align-items: flex-end; }
    .field { display: flex; flex-direction: column; gap: 0.2rem; flex: 1; }
    .field-check { flex-direction: row; align-items: center; gap: 0.35rem; flex: 0 0 auto; padding-bottom: 0.45rem; }
    .field-check input { width: auto; }
    .field-label { font-size: 0.75rem; font-weight: 600; color: #374151; }
</style>
