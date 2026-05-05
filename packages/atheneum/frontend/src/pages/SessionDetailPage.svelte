<script lang="ts">
    import { onMount } from "svelte";
    import { getSession, enrollSession, dropOutSession, completeSession, cancelSession } from "../lib/api.js";
    import type { LyceumSession, AttendanceRecord } from "../lib/api.js";
    import { session } from "../lib/session.js";
    import { selectedSessionId, currentPage } from "../lib/nav.js";

    let s        = $state<LyceumSession | null>(null);
    let loading  = $state(true);
    let error    = $state("");
    let attending = $state<Record<string, boolean>>({});

    const id = $derived($selectedSessionId ?? "");
    const me = $derived($session?.personId ?? "");
    const isInstructor = $derived(s ? s.instructorIds.includes(me) : false);
    const isEnrolled   = $derived(s ? s.enrollmentIds.includes(me) : false);

    onMount(async () => {
        if (!id) { currentPage.set("atheneum"); return; }
        s = await getSession(id);
        // Pre-fill attendance toggle from existing log
        for (const r of s.attendanceLog) attending[r.memberId] = r.attended;
        loading = false;
    });

    async function enroll() {
        try { s = await enrollSession(id); } catch (e) { error = (e as Error).message; }
    }

    async function drop() {
        try { s = await dropOutSession(id); } catch (e) { error = (e as Error).message; }
    }

    async function complete() {
        const log: AttendanceRecord[] = (s?.enrollmentIds ?? []).map(mid => ({
            memberId:   mid,
            attended:   attending[mid] ?? false,
            recordedAt: new Date().toISOString(),
        }));
        try { s = await completeSession(id, log); } catch (e) { error = (e as Error).message; }
    }

    async function cancel() {
        try { s = await cancelSession(id); currentPage.set("atheneum"); } catch (e) { error = (e as Error).message; }
    }
</script>

{#if loading}
    <p>Loading…</p>
{:else if s}
    <div class="page">
        <button class="back" onclick={() => currentPage.set("atheneum")}>← Back</button>

        <div class="header">
            <span class="category">{s.category}</span>
            <span class="status {s.status}">{s.status}</span>
        </div>
        <h1>{s.title}</h1>
        <p class="description">{s.description}</p>

        <div class="meta-grid">
            <div><strong>When</strong><br>{new Date(s.scheduledAt).toLocaleString()}</div>
            <div><strong>Duration</strong><br>{s.durationMinutes} min</div>
            <div><strong>Where</strong><br>{s.location}</div>
            <div><strong>Capacity</strong><br>{s.enrollmentIds.length}{s.capacity !== null ? ` / ${s.capacity}` : " (unlimited)"}</div>
            <div><strong>Instructor pay</strong><br>{s.instructorRateKin} kin</div>
            <div><strong>Student stipend</strong><br>{s.studentStipendKin} kin each</div>
        </div>

        {#if error}
            <p class="error">{error}</p>
        {/if}

        {#if s.status === "approved" && !isInstructor}
            {#if isEnrolled}
                <button class="btn secondary" onclick={drop}>Drop out</button>
            {:else}
                <button class="btn primary" onclick={enroll}>Enroll</button>
            {/if}
        {/if}

        {#if isInstructor && s.status === "approved"}
            <section class="attendance">
                <h2>Close Session & Record Attendance</h2>
                {#if s.enrollmentIds.length === 0}
                    <p class="muted">No one enrolled.</p>
                {:else}
                    <ul>
                        {#each s.enrollmentIds as mid (mid)}
                            <li>
                                <label>
                                    <input type="checkbox" bind:checked={attending[mid]} />
                                    {mid}
                                </label>
                            </li>
                        {/each}
                    </ul>
                {/if}
                <button class="btn primary" onclick={complete}>Complete session &amp; pay out</button>
                <button class="btn danger" onclick={cancel}>Cancel session</button>
            </section>
        {/if}
    </div>
{/if}

<style>
    .page { max-width: 700px; }
    .back { background: none; border: none; color: #3b82f6; cursor: pointer; padding: 0 0 1rem; font-size: 0.9rem; }
    .header { display: flex; gap: 0.75rem; align-items: center; margin-bottom: 0.5rem; }
    .category { font-size: 0.75rem; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; }
    .status { font-size: 0.75rem; padding: 0.2rem 0.5rem; border-radius: 999px; font-weight: 600; }
    .status.approved { background: #d1fae5; color: #065f46; }
    .status.draft { background: #f3f4f6; color: #374151; }
    .status.pending-approval { background: #fef3c7; color: #92400e; }
    .status.completed { background: #e0e7ff; color: #3730a3; }
    .status.cancelled { background: #fee2e2; color: #991b1b; }
    h1 { margin: 0 0 0.75rem; }
    .description { color: #374151; line-height: 1.6; }
    .meta-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin: 1.5rem 0; font-size: 0.9rem; }
    .error { color: #dc2626; }
    .attendance { margin-top: 2rem; border-top: 1px solid #e5e7eb; padding-top: 1.5rem; }
    .attendance ul { list-style: none; padding: 0; display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1rem; }
    .attendance label { display: flex; gap: 0.5rem; align-items: center; cursor: pointer; }
    .muted { color: #6b7280; }
    .btn { padding: 0.6rem 1.2rem; border-radius: 6px; border: none; font-size: 0.9rem; cursor: pointer; font-weight: 600; margin-right: 0.5rem; }
    .btn.primary { background: #3b82f6; color: #fff; }
    .btn.secondary { background: #f3f4f6; color: #374151; }
    .btn.danger { background: #fee2e2; color: #991b1b; }
</style>
