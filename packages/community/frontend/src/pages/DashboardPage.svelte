<script lang="ts">
    import { listCalendarEvents, type CalendarEventDto } from "../lib/api.js";
    import { currentPage, session } from "../lib/session.js";

    let events: CalendarEventDto[] = $state([]);
    let loading = $state(true);
    let error   = $state<string | null>(null);

    $effect(() => {
        listCalendarEvents({ upcoming: 10 })
            .then(e => { events = e; })
            .catch(() => { error = "Couldn't load events."; })
            .finally(() => { loading = false; });
    });

    function formatDate(iso: string, allDay: boolean): string {
        const d = new Date(iso);
        if (allDay) {
            return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
        }
        return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }) +
            " · " + d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    }

    const firstName = $derived($session?.firstName ?? "there");
</script>

<div class="page">
    <div class="greeting">
        <h1>Hello, {firstName}.</h1>
    </div>

    <section class="section">
        <div class="section-header">
            <h2>Upcoming Events</h2>
            <button class="link-btn" onclick={() => currentPage.go("calendar")}>See all</button>
        </div>

        {#if loading}
            <p class="muted">Loading…</p>
        {:else if error}
            <p class="muted">{error}</p>
        {:else if events.length === 0}
            <p class="muted">No upcoming events.</p>
        {:else}
            <ul class="event-list">
                {#each events as ev (ev.id + (ev.occurrenceDate ?? ""))}
                    <li class="event-item" class:cancelled={!!ev.cancelledAt}>
                        <div class="event-date">{formatDate(ev.occurrenceDate ?? ev.startAt, ev.allDay)}</div>
                        <div class="event-title">{ev.title}</div>
                        {#if ev.location}
                            <div class="event-location">{ev.location}</div>
                        {/if}
                    </li>
                {/each}
            </ul>
        {/if}
    </section>
</div>

<style>
    .page {
        padding: 1.5rem 1.25rem 6rem;
        max-width: 640px;
        margin: 0 auto;
    }

    .greeting {
        padding: 1.5rem 0 1rem;
    }

    .greeting h1 {
        font-size: 1.6rem;
        font-weight: 700;
        color: #1a202c;
        margin: 0;
    }

    .section {
        margin-top: 1.5rem;
    }

    .section-header {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        margin-bottom: 0.75rem;
    }

    .section-header h2 {
        font-size: 0.8rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: #a0aec0;
        margin: 0;
    }

    .link-btn {
        background: none;
        border: none;
        padding: 0;
        font-size: 0.85rem;
        color: #3182ce;
        cursor: pointer;
    }

    .link-btn:hover {
        text-decoration: underline;
    }

    .muted {
        font-size: 0.9rem;
        color: #a0aec0;
        margin: 0;
    }

    .event-list {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 0.1rem;
    }

    .event-item {
        padding: 0.75rem 0;
        border-bottom: 1px solid #f0f0f0;
    }

    .event-item:last-child {
        border-bottom: none;
    }

    .event-item.cancelled .event-title {
        text-decoration: line-through;
        color: #a0aec0;
    }

    .event-date {
        font-size: 0.78rem;
        font-weight: 600;
        color: #3182ce;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        margin-bottom: 0.2rem;
    }

    .event-title {
        font-size: 0.95rem;
        font-weight: 500;
        color: #1a202c;
    }

    .event-location {
        font-size: 0.82rem;
        color: #718096;
        margin-top: 0.15rem;
    }
</style>
