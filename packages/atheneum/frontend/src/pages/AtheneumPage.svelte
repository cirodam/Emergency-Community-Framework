<script lang="ts">
    import { onMount } from "svelte";
    import { listSessions, listCourses } from "../lib/api.js";
    import type { LyceumSession, Course } from "../lib/api.js";
    import { currentPage, selectedSessionId, selectedCourseId } from "../lib/nav.js";

    let sessions = $state<LyceumSession[]>([]);
    let courses  = $state<Course[]>([]);
    let tab      = $state<"upcoming" | "courses">("upcoming");
    let loading  = $state(true);

    onMount(async () => {
        [sessions, courses] = await Promise.all([
            listSessions({ status: "approved" }),
            listCourses(),
        ]);
        loading = false;
    });

    function openSession(id: string) {
        selectedSessionId.set(id);
        currentPage.set("session");
    }

    function openCourse(id: string) {
        selectedCourseId.set(id);
        currentPage.set("course");
    }
</script>

<div class="page">
    <h1>Atheneum</h1>

    <div class="tabs">
        <button class:active={tab === "upcoming"} onclick={() => tab = "upcoming"}>Upcoming Sessions</button>
        <button class:active={tab === "courses"}  onclick={() => tab = "courses"}>Courses</button>
    </div>

    {#if loading}
        <p class="muted">Loading…</p>
    {:else if tab === "upcoming"}
        {#if sessions.length === 0}
            <p class="muted">No upcoming sessions. <button class="link" onclick={() => currentPage.set("create-session")}>Propose one?</button></p>
        {:else}
            <div class="grid">
                {#each sessions as s (s.id)}
                    <button class="card" onclick={() => openSession(s.id)}>
                        <div class="card-category">{s.category}</div>
                        <div class="card-title">{s.title}</div>
                        <div class="card-meta">{new Date(s.scheduledAt).toLocaleString()} · {s.location}</div>
                        <div class="card-meta">{s.enrollmentIds.length}{s.capacity !== null ? ` / ${s.capacity}` : ""} enrolled · {s.studentStipendKin} kin stipend</div>
                    </button>
                {/each}
            </div>
        {/if}
    {:else}
        {#if courses.filter(c => c.status === "active").length === 0}
            <p class="muted">No active courses yet.</p>
        {:else}
            <div class="grid">
                {#each courses.filter(c => c.status === "active") as c (c.id)}
                    <button class="card" onclick={() => openCourse(c.id)}>
                        <div class="card-category">{c.category}</div>
                        <div class="card-title">{c.title}</div>
                        <div class="card-meta">{c.classIds.length} session{c.classIds.length === 1 ? "" : "s"}</div>
                        {#if c.prerequisites !== "none"}
                            <div class="card-meta prereq">Prerequisites: {c.prerequisites}</div>
                        {/if}
                    </button>
                {/each}
            </div>
        {/if}
    {/if}
</div>

<style>
    .page { max-width: 900px; }
    h1 { margin: 0 0 1.5rem; font-size: 1.8rem; }

    .tabs { display: flex; gap: 0.5rem; margin-bottom: 1.5rem; }
    .tabs button {
        padding: 0.5rem 1rem; border: 1px solid #d1d5db; background: #fff;
        border-radius: 6px; cursor: pointer; font-size: 0.9rem; color: #374151;
    }
    .tabs button.active { background: #1e293b; color: #fff; border-color: #1e293b; }

    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem; }

    .card {
        background: #fff; border: 1px solid #e5e7eb; border-radius: 10px;
        padding: 1.25rem; text-align: left; cursor: pointer; transition: box-shadow 0.15s;
        display: flex; flex-direction: column; gap: 0.4rem;
    }
    .card:hover { box-shadow: 0 2px 12px rgba(0,0,0,0.08); }

    .card-category { font-size: 0.75rem; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; }
    .card-title { font-weight: 600; font-size: 1rem; color: #111827; }
    .card-meta { font-size: 0.82rem; color: #6b7280; }
    .card-meta.prereq { color: #92400e; }

    .muted { color: #6b7280; }
    .link { background: none; border: none; color: #3b82f6; cursor: pointer; padding: 0; text-decoration: underline; }
</style>
