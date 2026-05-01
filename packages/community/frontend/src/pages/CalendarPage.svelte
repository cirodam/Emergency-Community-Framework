<script lang="ts">
    import {
        listCalendarEvents, createCalendarEvent, cancelCalendarEvent,
        rsvpCalendarEvent, removeCalendarRsvp,
        type CalendarEventDto, type RecurrenceRule,
    } from "../lib/api.js";
    import { session } from "../lib/session.js";

    // ── Month navigation ───────────────────────────────────────────────────────

    function startOfMonth(year: number, month: number): Date {
        return new Date(year, month, 1, 0, 0, 0, 0);
    }
    function daysInMonth(year: number, month: number): number {
        return new Date(year, month + 1, 0).getDate();
    }
    function isoDate(d: Date): string { return d.toISOString().slice(0, 10); }

    const today = new Date();
    let viewYear  = $state(today.getFullYear());
    let viewMonth = $state(today.getMonth()); // 0-based

    const monthLabel = $derived(
        new Date(viewYear, viewMonth, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" })
    );

    function prevMonth() {
        if (viewMonth === 0) { viewYear--; viewMonth = 11; }
        else                   viewMonth--;
    }
    function nextMonth() {
        if (viewMonth === 11) { viewYear++; viewMonth = 0; }
        else                    viewMonth++;
    }
    function goToday() { viewYear = today.getFullYear(); viewMonth = today.getMonth(); }

    // ── Calendar grid ──────────────────────────────────────────────────────────

    interface DayCell { date: Date; iso: string; inMonth: boolean; }

    const grid = $derived((): DayCell[] => {
        const first = startOfMonth(viewYear, viewMonth);
        // Start on Sunday (0) or Monday (1) — using Sunday
        const startDow = first.getDay(); // 0=Sun
        const total    = daysInMonth(viewYear, viewMonth);
        const cells: DayCell[] = [];
        // Pad before
        for (let i = startDow - 1; i >= 0; i--) {
            const d = new Date(first);
            d.setDate(d.getDate() - (i + 1));
            cells.push({ date: d, iso: isoDate(d), inMonth: false });
        }
        // Month days
        for (let day = 1; day <= total; day++) {
            const d = new Date(viewYear, viewMonth, day);
            cells.push({ date: d, iso: isoDate(d), inMonth: true });
        }
        // Pad after to fill rows
        while (cells.length % 7 !== 0) {
            const d = new Date(cells[cells.length - 1]!.date);
            d.setDate(d.getDate() + 1);
            cells.push({ date: d, iso: isoDate(d), inMonth: false });
        }
        return cells;
    });

    // ── Event data ─────────────────────────────────────────────────────────────

    let events   = $state<CalendarEventDto[]>([]);
    let loading  = $state(true);
    let error    = $state("");

    async function load() {
        loading = true; error = "";
        const first = startOfMonth(viewYear, viewMonth);
        const last  = new Date(viewYear, viewMonth + 1, 0, 23, 59, 59, 999);
        // Include a week buffer so recurring events starting before month are caught
        const from  = new Date(first); from.setDate(from.getDate() - 7);
        const to    = new Date(last);  to.setDate(to.getDate() + 7);
        try {
            events = await listCalendarEvents({ from: from.toISOString(), to: to.toISOString() });
        } catch (e) { error = (e as Error).message; }
        finally { loading = false; }
    }

    $effect(() => {
        viewYear; viewMonth; // reactive deps
        load();
    });

    // ── Event map by date ─────────────────────────────────────────────────────

    const eventsByDate = $derived((): Map<string, CalendarEventDto[]> => {
        const m = new Map<string, CalendarEventDto[]>();
        for (const ev of events) {
            const d = (ev.occurrenceDate ?? ev.startAt).slice(0, 10);
            if (!m.has(d)) m.set(d, []);
            m.get(d)!.push(ev);
        }
        return m;
    });

    // ── Selected day panel ────────────────────────────────────────────────────

    let selectedDate = $state<string | null>(null);
    const selectedEvents = $derived(
        selectedDate ? (eventsByDate().get(selectedDate) ?? []) : []
    );

    function selectDay(iso: string) {
        selectedDate = selectedDate === iso ? null : iso;
        showCreateForm = false;
    }

    // ── Formatting helpers ────────────────────────────────────────────────────

    function fmtTime(iso: string): string {
        return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
    }
    function fmtDayHeader(iso: string): string {
        return new Date(iso + "T12:00:00").toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
    }
    function fmtDuration(start: string, end: string | null): string {
        if (!end) return fmtTime(start);
        return `${fmtTime(start)} – ${fmtTime(end)}`;
    }

    const RECURRENCE_LABELS: Record<string, string> = {
        daily:    "Daily",
        weekly:   "Weekly",
        biweekly: "Every 2 weeks",
        monthly:  "Monthly",
        yearly:   "Yearly",
    };

    // ── RSVP ─────────────────────────────────────────────────────────────────

    let rsvpBusy = $state<string | null>(null); // eventId being acted on

    async function handleRsvp(ev: CalendarEventDto, status: "yes" | "no" | "maybe") {
        if (!$session) return;
        rsvpBusy = ev.id;
        try {
            const myRsvp = ev.rsvps.find(r => r.personId === $session!.personId);
            let updated: CalendarEventDto;
            if (myRsvp?.status === status) {
                updated = await removeCalendarRsvp(ev.id, $session.personId);
            } else {
                updated = await rsvpCalendarEvent(ev.id, $session.personId, status);
            }
            events = events.map(e => e.id === updated.id && e.occurrenceDate === ev.occurrenceDate ? { ...updated, occurrenceDate: ev.occurrenceDate } : e);
        } catch { /* silent */ }
        finally { rsvpBusy = null; }
    }

    function myRsvpStatus(ev: CalendarEventDto): "yes" | "no" | "maybe" | null {
        if (!$session) return null;
        return ev.rsvps.find(r => r.personId === $session!.personId)?.status ?? null;
    }

    function rsvpCounts(ev: CalendarEventDto) {
        const yes   = ev.rsvps.filter(r => r.status === "yes").length;
        const maybe = ev.rsvps.filter(r => r.status === "maybe").length;
        return { yes, maybe };
    }

    // ── Cancel event ─────────────────────────────────────────────────────────

    async function handleCancel(ev: CalendarEventDto) {
        if (!confirm(`Cancel "${ev.title}"?`)) return;
        try {
            const updated = await cancelCalendarEvent(ev.id);
            events = events.map(e => e.id === updated.id ? { ...e, cancelledAt: updated.cancelledAt } : e);
        } catch { /* silent */ }
    }

    // ── Create form ───────────────────────────────────────────────────────────

    let showCreateForm = $state(false);
    let creating       = $state(false);
    let createError    = $state("");

    let form = $state({
        title:            "",
        description:      "",
        location:         "",
        date:             "",
        startTime:        "09:00",
        endTime:          "",
        allDay:           false,
        recurrence:       "" as RecurrenceRule | "",
        recurrenceEndsAt: "",
    });

    function openCreate() {
        form = {
            title:            "",
            description:      "",
            location:         "",
            date:             selectedDate ?? isoDate(today),
            startTime:        "09:00",
            endTime:          "",
            allDay:           false,
            recurrence:       "",
            recurrenceEndsAt: "",
        };
        createError    = "";
        showCreateForm = true;
    }

    function buildIso(date: string, time: string): string {
        return new Date(`${date}T${time}:00`).toISOString();
    }

    async function submitCreate(e: SubmitEvent) {
        e.preventDefault();
        if (!$session || !form.title.trim() || !form.date) return;
        creating = true; createError = "";
        try {
            const startAt = form.allDay ? `${form.date}T00:00:00.000Z` : buildIso(form.date, form.startTime);
            const endAt   = (!form.allDay && form.endTime) ? buildIso(form.date, form.endTime) : null;
            const recurrenceEndsAt = form.recurrenceEndsAt ? new Date(form.recurrenceEndsAt + "T23:59:59").toISOString() : null;
            const created = await createCalendarEvent({
                title:            form.title.trim(),
                startAt,
                organizerId:      $session.personId,
                organizerType:    "person",
                endAt,
                allDay:           form.allDay,
                description:      form.description.trim() || null,
                location:         form.location.trim() || null,
                recurrence:       form.recurrence || null,
                recurrenceEndsAt,
            });
            showCreateForm = false;
            // Re-load to get expanded occurrences
            await load();
            // Auto-select the day of the new event
            selectedDate = created.startAt.slice(0, 10);
        } catch (err) {
            createError = (err as Error).message;
        } finally {
            creating = false;
        }
    }
</script>

<div class="page">
    <!-- Header -->
    <div class="page-header">
        <div class="nav-row">
            <button class="nav-btn" onclick={prevMonth} aria-label="Previous month">‹</button>
            <h1 class="month-label">{monthLabel}</h1>
            <button class="nav-btn" onclick={nextMonth} aria-label="Next month">›</button>
        </div>
        <div class="header-actions">
            <button class="today-btn" onclick={goToday}>Today</button>
            {#if $session}
                <button class="create-btn" onclick={openCreate}>+ New Event</button>
            {/if}
        </div>
    </div>

    {#if error}
        <p class="state-msg error">{error}</p>
    {/if}

    <!-- Month grid -->
    <div class="grid-wrap">
        <div class="dow-row">
            {#each ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"] as d}
                <div class="dow-cell">{d}</div>
            {/each}
        </div>
        <div class="day-grid" class:loading>
            {#each grid() as cell (cell.iso)}
                {@const dayEvents = eventsByDate().get(cell.iso) ?? []}
                {@const isToday   = cell.iso === isoDate(today)}
                {@const isSelected = cell.iso === selectedDate}
                <button
                    class="day-cell"
                    class:out-of-month={!cell.inMonth}
                    class:is-today={isToday}
                    class:is-selected={isSelected}
                    onclick={() => selectDay(cell.iso)}
                >
                    <span class="day-num">{cell.date.getDate()}</span>
                    <span class="dot-row">
                        {#each dayEvents.slice(0, 3) as ev}
                            <span
                                class="dot"
                                class:dot-cancelled={!!ev.cancelledAt}
                                class:dot-recurring={!!ev.recurrence}
                                title={ev.title}
                            ></span>
                        {/each}
                        {#if dayEvents.length > 3}
                            <span class="dot-more">+{dayEvents.length - 3}</span>
                        {/if}
                    </span>
                </button>
            {/each}
        </div>
    </div>

    <!-- Day panel -->
    {#if selectedDate}
        <div class="day-panel">
            <h2 class="day-panel-title">{fmtDayHeader(selectedDate)}</h2>

            {#if selectedEvents.length === 0}
                <p class="day-empty">No events on this day.</p>
            {:else}
                <ul class="event-list">
                    {#each selectedEvents as ev (ev.id + (ev.occurrenceDate ?? ""))}
                        <li class="event-card" class:cancelled={!!ev.cancelledAt}>
                            <div class="event-header">
                                <span class="event-title">{ev.title}</span>
                                <div class="event-badges">
                                    {#if ev.recurrence}
                                        <span class="badge badge-repeat" title={RECURRENCE_LABELS[ev.recurrence]}
                                            >↻ {RECURRENCE_LABELS[ev.recurrence]}</span>
                                    {/if}
                                    {#if ev.cancelledAt}
                                        <span class="badge badge-cancelled">Cancelled</span>
                                    {/if}
                                </div>
                            </div>

                            {#if !ev.allDay}
                                <p class="event-time">{fmtDuration(ev.startAt, ev.endAt)}</p>
                            {:else}
                                <p class="event-time">All day</p>
                            {/if}

                            {#if ev.location}
                                <p class="event-meta">📍 {ev.location}</p>
                            {/if}
                            {#if ev.description}
                                <p class="event-desc">{ev.description}</p>
                            {/if}

                            <!-- RSVP counts -->
                            {#if ev.rsvps.length > 0}
                                {@const counts = rsvpCounts(ev)}
                                <p class="event-rsvp-counts">
                                    {counts.yes} going{counts.maybe ? `, ${counts.maybe} maybe` : ""}
                                </p>
                            {/if}

                            <!-- RSVP buttons -->
                            {#if $session && !ev.cancelledAt}
                                {@const mine = myRsvpStatus(ev)}
                                <div class="rsvp-row">
                                    <button
                                        class="rsvp-btn"
                                        class:rsvp-active-yes={mine === "yes"}
                                        disabled={rsvpBusy === ev.id}
                                        onclick={() => handleRsvp(ev, "yes")}
                                    >✓ Going</button>
                                    <button
                                        class="rsvp-btn"
                                        class:rsvp-active-maybe={mine === "maybe"}
                                        disabled={rsvpBusy === ev.id}
                                        onclick={() => handleRsvp(ev, "maybe")}
                                    >? Maybe</button>
                                    <button
                                        class="rsvp-btn"
                                        class:rsvp-active-no={mine === "no"}
                                        disabled={rsvpBusy === ev.id}
                                        onclick={() => handleRsvp(ev, "no")}
                                    >✗ No</button>
                                    {#if ev.createdBy === $session.personId}
                                        <button class="cancel-btn" onclick={() => handleCancel(ev)}>Cancel event</button>
                                    {/if}
                                </div>
                            {/if}
                        </li>
                    {/each}
                </ul>
            {/if}

            {#if $session}
                <button class="add-on-day-btn" onclick={openCreate}>+ Add event on this day</button>
            {/if}
        </div>
    {/if}

    <!-- Create form -->
    {#if showCreateForm}
        <div class="modal-overlay" role="dialog" aria-modal="true">
            <div class="modal">
                <div class="modal-header">
                    <h2 class="modal-title">New Event</h2>
                    <button class="modal-close" onclick={() => (showCreateForm = false)} aria-label="Close">✕</button>
                </div>

                <form class="create-form" onsubmit={submitCreate}>
                    <label class="field">
                        <span>Title *</span>
                        <input type="text" bind:value={form.title} required placeholder="Community meeting…" />
                    </label>

                    <div class="field-row">
                        <label class="field">
                            <span>Date *</span>
                            <input type="date" bind:value={form.date} required />
                        </label>
                        <label class="field field-check">
                            <input type="checkbox" bind:checked={form.allDay} />
                            <span>All day</span>
                        </label>
                    </div>

                    {#if !form.allDay}
                        <div class="field-row">
                            <label class="field">
                                <span>Start time</span>
                                <input type="time" bind:value={form.startTime} />
                            </label>
                            <label class="field">
                                <span>End time</span>
                                <input type="time" bind:value={form.endTime} />
                            </label>
                        </div>
                    {/if}

                    <label class="field">
                        <span>Location</span>
                        <input type="text" bind:value={form.location} placeholder="Community hall, field 3…" />
                    </label>

                    <label class="field">
                        <span>Description</span>
                        <textarea bind:value={form.description} rows="3" placeholder="Details…"></textarea>
                    </label>

                    <div class="field-row">
                        <label class="field">
                            <span>Repeats</span>
                            <select bind:value={form.recurrence}>
                                <option value="">One-time</option>
                                <option value="daily">Daily</option>
                                <option value="weekly">Weekly</option>
                                <option value="biweekly">Every 2 weeks</option>
                                <option value="monthly">Monthly</option>
                                <option value="yearly">Yearly</option>
                            </select>
                        </label>
                        {#if form.recurrence}
                            <label class="field">
                                <span>Ends on</span>
                                <input type="date" bind:value={form.recurrenceEndsAt} />
                            </label>
                        {/if}
                    </div>

                    {#if createError}
                        <p class="form-error">{createError}</p>
                    {/if}

                    <div class="form-actions">
                        <button type="button" class="btn-secondary" onclick={() => (showCreateForm = false)}>Cancel</button>
                        <button type="submit" class="btn-primary" disabled={creating}>
                            {creating ? "Creating…" : "Create Event"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    {/if}
</div>

<style>
    .page {
        max-width: 720px;
        margin: 0 auto;
        padding: 1rem 0.75rem 5rem;
    }

    /* ── Header ────────────────────────────────────────────────────────────── */
    .page-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 0.5rem;
        margin-bottom: 1rem;
    }

    .nav-row {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .nav-btn {
        background: none;
        border: 1px solid #e2e8f0;
        border-radius: 0.375rem;
        padding: 0.25rem 0.6rem;
        font-size: 1.1rem;
        color: #475569;
        cursor: pointer;
        line-height: 1;
    }
    .nav-btn:hover { background: #f1f5f9; }

    .month-label {
        font-size: 1.1rem;
        font-weight: 700;
        color: #0f172a;
        margin: 0;
        min-width: 10rem;
        text-align: center;
    }

    .header-actions {
        display: flex;
        gap: 0.5rem;
    }

    .today-btn {
        padding: 0.3rem 0.75rem;
        border: 1px solid #cbd5e1;
        border-radius: 0.375rem;
        background: #fff;
        font-size: 0.8rem;
        color: #475569;
        cursor: pointer;
    }
    .today-btn:hover { background: #f1f5f9; }

    .create-btn {
        padding: 0.3rem 0.75rem;
        border: none;
        border-radius: 0.375rem;
        background: #16a34a;
        color: #fff;
        font-size: 0.8rem;
        font-weight: 600;
        cursor: pointer;
    }
    .create-btn:hover { background: #15803d; }

    .state-msg { text-align: center; color: #94a3b8; padding: 1rem 0; }
    .state-msg.error { color: #dc2626; }

    /* ── Grid ──────────────────────────────────────────────────────────────── */
    .grid-wrap { border: 1px solid #e2e8f0; border-radius: 0.75rem; overflow: hidden; }

    .dow-row {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        background: #f8fafc;
        border-bottom: 1px solid #e2e8f0;
    }
    .dow-cell {
        text-align: center;
        font-size: 0.7rem;
        font-weight: 600;
        color: #94a3b8;
        letter-spacing: 0.05em;
        padding: 0.35rem 0;
    }

    .day-grid {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        transition: opacity 0.15s;
    }
    .day-grid.loading { opacity: 0.4; pointer-events: none; }

    .day-cell {
        min-height: 4rem;
        border-right: 1px solid #f1f5f9;
        border-bottom: 1px solid #f1f5f9;
        padding: 0.3rem 0.35rem 0.25rem;
        background: #fff;
        text-align: left;
        cursor: pointer;
        display: flex;
        flex-direction: column;
        gap: 0.15rem;
        transition: background 0.1s;
    }
    .day-cell:nth-child(7n) { border-right: none; }
    .day-cell:hover { background: #f8fafc; }
    .day-cell.out-of-month { background: #fafafa; }
    .day-cell.is-today .day-num {
        background: #16a34a;
        color: #fff;
        border-radius: 50%;
        width: 1.4rem;
        height: 1.4rem;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.78rem;
    }
    .day-cell.is-selected { background: #f0fdf4; }
    .day-cell.is-selected .day-num { color: #16a34a; font-weight: 700; }

    .day-num {
        font-size: 0.78rem;
        font-weight: 500;
        color: #334155;
        line-height: 1;
    }
    .out-of-month .day-num { color: #cbd5e1; }

    .dot-row {
        display: flex;
        flex-wrap: wrap;
        gap: 2px;
        align-items: center;
    }
    .dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #16a34a;
        flex-shrink: 0;
    }
    .dot.dot-cancelled { background: #94a3b8; }
    .dot.dot-recurring { background: #2563eb; }
    .dot-more {
        font-size: 0.6rem;
        color: #94a3b8;
        line-height: 1;
    }

    /* ── Day panel ─────────────────────────────────────────────────────────── */
    .day-panel {
        margin-top: 1.25rem;
        border: 1px solid #e2e8f0;
        border-radius: 0.75rem;
        padding: 1rem;
    }

    .day-panel-title {
        font-size: 0.95rem;
        font-weight: 600;
        color: #0f172a;
        margin: 0 0 0.75rem;
    }

    .day-empty { color: #94a3b8; font-size: 0.875rem; margin: 0.5rem 0 1rem; }

    .event-list {
        list-style: none;
        margin: 0 0 0.75rem;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 0.6rem;
    }

    .event-card {
        border: 1px solid #e2e8f0;
        border-radius: 0.5rem;
        padding: 0.65rem 0.75rem;
        background: #fff;
    }
    .event-card.cancelled { opacity: 0.55; }

    .event-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 0.5rem;
        margin-bottom: 0.2rem;
    }

    .event-title {
        font-size: 0.9rem;
        font-weight: 600;
        color: #0f172a;
    }

    .event-badges { display: flex; gap: 0.3rem; flex-wrap: wrap; }

    .badge {
        font-size: 0.68rem;
        padding: 0.1rem 0.4rem;
        border-radius: 9999px;
        font-weight: 500;
    }
    .badge-repeat    { background: #dbeafe; color: #1d4ed8; }
    .badge-cancelled { background: #fee2e2; color: #b91c1c; }

    .event-time { font-size: 0.78rem; color: #64748b; margin: 0 0 0.2rem; }
    .event-meta { font-size: 0.78rem; color: #64748b; margin: 0 0 0.2rem; }
    .event-desc { font-size: 0.8rem; color: #475569; margin: 0.25rem 0 0.3rem; white-space: pre-wrap; }
    .event-rsvp-counts { font-size: 0.75rem; color: #94a3b8; margin: 0 0 0.4rem; }

    .rsvp-row {
        display: flex;
        flex-wrap: wrap;
        gap: 0.35rem;
        margin-top: 0.4rem;
    }

    .rsvp-btn {
        padding: 0.25rem 0.6rem;
        border: 1px solid #e2e8f0;
        border-radius: 9999px;
        background: #fff;
        font-size: 0.75rem;
        color: #475569;
        cursor: pointer;
    }
    .rsvp-btn:hover:not(:disabled) { background: #f1f5f9; }
    .rsvp-btn:disabled { opacity: 0.5; cursor: default; }
    .rsvp-btn.rsvp-active-yes   { background: #dcfce7; border-color: #16a34a; color: #15803d; }
    .rsvp-btn.rsvp-active-maybe { background: #fef9c3; border-color: #ca8a04; color: #92400e; }
    .rsvp-btn.rsvp-active-no    { background: #fee2e2; border-color: #dc2626; color: #b91c1c; }

    .cancel-btn {
        padding: 0.25rem 0.6rem;
        border: 1px solid #fecaca;
        border-radius: 9999px;
        background: #fff;
        font-size: 0.75rem;
        color: #dc2626;
        cursor: pointer;
        margin-left: auto;
    }
    .cancel-btn:hover { background: #fee2e2; }

    .add-on-day-btn {
        margin-top: 0.25rem;
        background: none;
        border: 1px dashed #cbd5e1;
        border-radius: 0.375rem;
        padding: 0.4rem 0.75rem;
        font-size: 0.8rem;
        color: #64748b;
        cursor: pointer;
        width: 100%;
    }
    .add-on-day-btn:hover { border-color: #94a3b8; background: #f8fafc; }

    /* ── Modal ─────────────────────────────────────────────────────────────── */
    .modal-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.45);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 50;
        padding: 1rem;
    }

    .modal {
        background: #fff;
        border-radius: 0.75rem;
        width: 100%;
        max-width: 480px;
        max-height: 90vh;
        overflow-y: auto;
        box-shadow: 0 20px 60px rgba(0,0,0,0.2);
    }

    .modal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 1rem 1.25rem 0.75rem;
        border-bottom: 1px solid #f1f5f9;
    }

    .modal-title {
        font-size: 1rem;
        font-weight: 700;
        color: #0f172a;
        margin: 0;
    }

    .modal-close {
        background: none;
        border: none;
        font-size: 1rem;
        color: #94a3b8;
        cursor: pointer;
        padding: 0.25rem;
    }
    .modal-close:hover { color: #475569; }

    .create-form {
        padding: 1rem 1.25rem 1.25rem;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    .field {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        flex: 1;
    }
    .field span {
        font-size: 0.78rem;
        font-weight: 600;
        color: #374151;
    }
    .field input, .field select, .field textarea {
        padding: 0.45rem 0.65rem;
        border: 1px solid #cbd5e1;
        border-radius: 0.375rem;
        font-size: 0.875rem;
        font-family: inherit;
        background: #fff;
        color: #0f172a;
    }
    .field input:focus, .field select:focus, .field textarea:focus {
        outline: none;
        border-color: #16a34a;
        box-shadow: 0 0 0 2px #bbf7d0;
    }
    .field textarea { resize: vertical; }

    .field-check {
        flex-direction: row;
        align-items: center;
        gap: 0.4rem;
        justify-content: flex-end;
        padding-top: 1.2rem;
    }
    .field-check input { width: auto; }

    .field-row {
        display: flex;
        gap: 0.75rem;
        align-items: flex-end;
    }

    .form-error { font-size: 0.8rem; color: #dc2626; margin: 0; }

    .form-actions {
        display: flex;
        gap: 0.5rem;
        justify-content: flex-end;
        margin-top: 0.25rem;
    }

    .btn-primary {
        padding: 0.5rem 1.1rem;
        border: none;
        border-radius: 0.375rem;
        background: #16a34a;
        color: #fff;
        font-size: 0.875rem;
        font-weight: 600;
        cursor: pointer;
    }
    .btn-primary:hover:not(:disabled) { background: #15803d; }
    .btn-primary:disabled { opacity: 0.6; cursor: default; }

    .btn-secondary {
        padding: 0.5rem 1.1rem;
        border: 1px solid #cbd5e1;
        border-radius: 0.375rem;
        background: #fff;
        font-size: 0.875rem;
        color: #374151;
        cursor: pointer;
    }
    .btn-secondary:hover { background: #f1f5f9; }
</style>
