<script lang="ts">
    import { onMount } from "svelte";
    import { getCourse, listSessions, enrollCourse } from "../lib/api.js";
    import type { Course, LyceumSession } from "../lib/api.js";
    import { selectedCourseId, selectedSessionId, currentPage } from "../lib/nav.js";

    let course   = $state<Course | null>(null);
    let sessions = $state<LyceumSession[]>([]);
    let loading  = $state(true);
    let error    = $state("");

    const id = $derived($selectedCourseId ?? "");

    onMount(async () => {
        if (!id) { currentPage.set("atheneum"); return; }
        const [c, allSessions] = await Promise.all([
            getCourse(id),
            listSessions({ courseId: id }),
        ]);
        course   = c;
        sessions = allSessions.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
        loading  = false;
    });

    async function enroll() {
        try { course = await enrollCourse(id); } catch (e) { error = (e as Error).message; }
    }

    function openSession(sid: string) {
        selectedSessionId.set(sid);
        currentPage.set("session");
    }
</script>

{#if loading}
    <p>Loading…</p>
{:else if course}
    <div class="page">
        <button class="back" onclick={() => currentPage.set("atheneum")}>← Back</button>

        <div class="header">
            <span class="category">{course.category}</span>
            <span class="status {course.status}">{course.status}</span>
        </div>
        <h1>{course.title}</h1>
        <p class="description">{course.description}</p>

        {#if course.prerequisites !== "none"}
            <p class="prereq">Prerequisites: {course.prerequisites}</p>
        {/if}

        {#if error}<p class="error">{error}</p>{/if}

        {#if course.status === "active"}
            <button class="btn primary" onclick={enroll}>Enroll in full course</button>
        {/if}

        <section class="sessions">
            <h2>Sessions ({sessions.length})</h2>
            {#if sessions.length === 0}
                <p class="muted">No sessions added yet.</p>
            {:else}
                <ul>
                    {#each sessions as s (s.id)}
                        <li>
                            <button class="session-row" onclick={() => openSession(s.id)}>
                                <span class="session-title">{s.title}</span>
                                <span class="session-meta">{new Date(s.scheduledAt).toLocaleString()} · {s.location}</span>
                                <span class="status {s.status}">{s.status}</span>
                            </button>
                        </li>
                    {/each}
                </ul>
            {/if}
        </section>
    </div>
{/if}

<style>
    .page { max-width: 700px; }
    .back { background: none; border: none; color: #3b82f6; cursor: pointer; padding: 0 0 1rem; font-size: 0.9rem; }
    .header { display: flex; gap: 0.75rem; align-items: center; margin-bottom: 0.5rem; }
    .category { font-size: 0.75rem; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; }
    .status { font-size: 0.75rem; padding: 0.2rem 0.5rem; border-radius: 999px; font-weight: 600; }
    .status.active { background: #d1fae5; color: #065f46; }
    .status.approved { background: #d1fae5; color: #065f46; }
    .status.draft { background: #f3f4f6; color: #374151; }
    .status.completed { background: #e0e7ff; color: #3730a3; }
    .status.cancelled { background: #fee2e2; color: #991b1b; }
    h1 { margin: 0 0 0.75rem; }
    .description { color: #374151; line-height: 1.6; }
    .prereq { color: #92400e; font-size: 0.9rem; }
    .error { color: #dc2626; }
    .muted { color: #6b7280; }
    .btn { padding: 0.6rem 1.2rem; border-radius: 6px; border: none; font-size: 0.9rem; cursor: pointer; font-weight: 600; margin: 0.5rem 0 1.5rem; }
    .btn.primary { background: #3b82f6; color: #fff; }
    .sessions { margin-top: 2rem; }
    .sessions h2 { margin-bottom: 0.75rem; }
    .sessions ul { list-style: none; padding: 0; display: flex; flex-direction: column; gap: 0.5rem; }
    .session-row {
        width: 100%; display: flex; align-items: center; gap: 1rem;
        background: #fff; border: 1px solid #e5e7eb; border-radius: 8px;
        padding: 0.75rem 1rem; cursor: pointer; text-align: left;
    }
    .session-row:hover { background: #f9fafb; }
    .session-title { font-weight: 600; flex: 1; }
    .session-meta { font-size: 0.82rem; color: #6b7280; }
</style>
