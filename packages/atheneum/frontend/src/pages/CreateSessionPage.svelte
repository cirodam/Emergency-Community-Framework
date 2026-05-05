<script lang="ts">
    import { createSession, submitSession } from "../lib/api.js";
    import type { LyceumSession, SessionCategory } from "../lib/api.js";
    import { currentPage, selectedSessionId } from "../lib/nav.js";
    import { session } from "../lib/session.js";

    const CATEGORIES: SessionCategory[] = [
        "practical-skills", "health-wellness", "arts-culture",
        "civic-governance", "languages", "trades", "agriculture", "other",
    ];

    let title             = $state("");
    let description       = $state("");
    let category          = $state<SessionCategory>("practical-skills");
    let scheduledAt       = $state("");
    let durationMinutes   = $state(60);
    let location          = $state("");
    let instructorRateKin = $state(0);
    let studentStipendKin = $state(0);
    let capacity          = $state<number | null>(null);
    let submitting        = $state(false);
    let error             = $state("");
    let created           = $state<LyceumSession | null>(null);

    const me = $derived($session);

    // Estimated total budget: instructor pay + stipend × estimated attendance
    const estimatedBudget = $derived(
        instructorRateKin + studentStipendKin * (capacity ?? 10)
    );

    async function submit() {
        if (!me) { error = "Not logged in"; return; }
        submitting = true;
        error      = "";
        try {
            const s = await createSession({
                title, description, category, scheduledAt,
                durationMinutes, location, instructorRateKin,
                studentStipendKin, capacity,
                // Include personId so the backend can wire up the payout split.
                instructorSplits: [{ personId: me.personId, handle: me.handle, pct: 100 }],
            });
            created = s;
        } catch (e) {
            error = (e as Error).message;
        } finally {
            submitting = false;
        }
    }

    async function submitForApproval() {
        if (!created) return;
        try {
            await submitSession(created.id);
            selectedSessionId.set(created.id);
            currentPage.set("session");
        } catch (e) {
            error = (e as Error).message;
        }
    }
</script>

<div class="page">
    <button class="back" onclick={() => currentPage.set("atheneum")}>← Back</button>
    <h1>Propose a Session</h1>

    {#if created}
        <div class="success">
            <p>Session <strong>{created.title}</strong> created as a draft.</p>
            <button class="btn primary" onclick={submitForApproval}>Submit to Teachers pool for approval</button>
            <button class="btn secondary" onclick={() => { selectedSessionId.set(created?.id ?? ""); currentPage.set("session"); }}>View draft</button>
        </div>
    {:else}
        <form onsubmit={(e) => { e.preventDefault(); submit(); }}>
            <label>
                Title
                <input type="text" bind:value={title} required />
            </label>

            <label>
                Description
                <textarea bind:value={description} rows={4} required></textarea>
            </label>

            <label>
                Category
                <select bind:value={category}>
                    {#each CATEGORIES as c (c)}
                        <option value={c}>{c}</option>
                    {/each}
                </select>
            </label>

            <div class="row">
                <label>
                    Date &amp; Time
                    <input type="datetime-local" bind:value={scheduledAt} required />
                </label>
                <label>
                    Duration (minutes)
                    <input type="number" bind:value={durationMinutes} min={15} required />
                </label>
            </div>

            <label>
                Location
                <input type="text" bind:value={location} placeholder="e.g. Community Hall Room 3 or Online" required />
            </label>

            <div class="row">
                <label>
                    Instructor pay (kin)
                    <input type="number" bind:value={instructorRateKin} min={0} required />
                </label>
                <label>
                    Student stipend (kin each)
                    <input type="number" bind:value={studentStipendKin} min={0} required />
                </label>
                <label>
                    Capacity (blank = unlimited)
                    <input type="number" value={capacity ?? ""} oninput={(e) => { const v = (e.target as HTMLInputElement).valueAsNumber; capacity = isNaN(v) ? null : v; }} min={1} />
                </label>
            </div>

            <p class="budget-hint">
                Estimated budget request: <strong>{estimatedBudget} kin</strong>
                {#if capacity === null}(assumes 10 students){/if}
            </p>

            {#if error}<p class="error">{error}</p>{/if}

            <button class="btn primary" type="submit" disabled={submitting}>
                {submitting ? "Creating…" : "Create draft"}
            </button>
        </form>
    {/if}
</div>

<style>
    .page { max-width: 640px; }
    .back { background: none; border: none; color: #3b82f6; cursor: pointer; padding: 0 0 1rem; font-size: 0.9rem; }
    h1 { margin: 0 0 1.5rem; }
    form { display: flex; flex-direction: column; gap: 1rem; }
    label { display: flex; flex-direction: column; gap: 0.3rem; font-weight: 500; font-size: 0.9rem; color: #374151; }
    input, textarea, select { padding: 0.5rem 0.75rem; border: 1px solid #d1d5db; border-radius: 6px; font-size: 0.9rem; font-family: inherit; }
    textarea { resize: vertical; }
    .row { display: flex; gap: 1rem; flex-wrap: wrap; }
    .row label { flex: 1; min-width: 140px; }
    .error { color: #dc2626; font-size: 0.9rem; }
    .success { display: flex; flex-direction: column; gap: 0.75rem; }
    .btn { padding: 0.6rem 1.2rem; border-radius: 6px; border: none; font-size: 0.9rem; cursor: pointer; font-weight: 600; width: fit-content; }
    .btn.primary { background: #3b82f6; color: #fff; }
    .btn.secondary { background: #f3f4f6; color: #374151; }
    .btn:disabled { opacity: 0.6; cursor: default; }
    .budget-hint { font-size: 0.85rem; color: #374151; margin: 0; padding: 0.6rem 0.75rem; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; }
</style>
