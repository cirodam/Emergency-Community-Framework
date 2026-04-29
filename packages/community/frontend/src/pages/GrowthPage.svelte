<script lang="ts">
    import { getEconomics, getFederationMembership } from "../lib/api.js";

    let memberCount = $state(0);
    let fedStatus   = $state<"none" | "pending" | "approved" | "rejected">("none");
    let loading     = $state(true);
    let error       = $state("");

    $effect(() => {
        (async () => {
            loading = true;
            error   = "";
            try {
                const [econ, fed] = await Promise.all([
                    getEconomics(),
                    getFederationMembership().catch(() => null),
                ]);
                memberCount = econ.demographics?.total ?? 0;
                fedStatus   = fed?.status ?? "none";
            } catch (e) {
                error = e instanceof Error ? e.message : "Failed to load data";
            } finally {
                loading = false;
            }
        })();
    });

    // ── Milestone definitions ─────────────────────────────────────────────────
    //
    // Each milestone has a threshold (min members), a headline, a description,
    // and a list of roles to fill at that stage.

    interface Role {
        title:       string;
        why:         string;
        /** Optional — link to open vacancies / nominations page */
        action?:     string;
    }

    interface Milestone {
        id:          string;
        threshold:   number;
        icon:        string;
        headline:    string;
        description: string;
        roles:       Role[];
    }

    const milestones: Milestone[] = [
        {
            id:        "cluster",
            threshold: 30,
            icon:      "⊚",
            headline:  "First Cluster",
            description:
                "At 30 people informal goodwill stops being enough. Designate clear " +
                "ownership for food, health, and water now — before a gap in coverage " +
                "becomes a crisis.",
            roles: [
                {
                    title: "Food Coordinator",
                    why:   "Organises collective purchasing, tracks pantry and shared larder stock, " +
                           "and knows where the nearest resupply is. Food is the first thing that " +
                           "breaks down when there's no named owner.",
                },
                {
                    title: "First Aid Officer",
                    why:   "Maintains the group's medical kit, knows who has clinical training, " +
                           "and is the first call when someone is hurt or ill. Does not need to be " +
                           "a doctor — just prepared and reachable.",
                },
                {
                    title: "Water & Sanitation Monitor",
                    why:   "Checks drinking water safety, manages hygiene supplies, and watches " +
                           "for contamination or waste issues. Disease spreads through water and " +
                           "sanitation failures faster than almost anything else.",
                },
                {
                    title: "Steward / Convenor",
                    why:   "Calls meetings, collects decisions, and is the point of contact. " +
                           "Doesn't need to be a leader — just a reliable anchor.",
                },
            ],
        },
        {
            id:        "community",
            threshold: 75,
            icon:      "◉",
            headline:  "Community",
            description:
                "Food and health now require dedicated people, not part-timers. At this " +
                "size a single illness can spread, and a single crop failure hits everyone. " +
                "Separate roles from goodwill.",
            roles: [
                {
                    title: "Medical Officer",
                    why:   "Primary point of care: triage, referrals, health checks. Coordinates " +
                           "any practitioners in the group and tracks the health status of vulnerable " +
                           "members (elderly, children, those with chronic conditions).",
                    action: "vacancies",
                },
                {
                    title: "Medical Supply Officer",
                    why:   "Maintains a full inventory of medications, wound care, and diagnostics. " +
                           "Tracks expiry dates, reorders before stock runs out, and knows what " +
                           "can be substituted if resupply fails.",
                    action: "vacancies",
                },
                {
                    title: "Food Production Lead",
                    why:   "Plans and oversees growing, foraging, or sourcing food — not just " +
                           "purchasing. Begins moving the community toward food autonomy by " +
                           "maintaining gardens, seed stock, and relationships with growers.",
                    action: "vacancies",
                },
                {
                    title: "Sanitation & Waste Lead",
                    why:   "Manages composting, waste disposal, and sewage. At 75 people, poor " +
                           "sanitation is the most likely vector for a disease outbreak.",
                    action: "vacancies",
                },
                {
                    title: "Childcare Coordinator",
                    why:   "Organises care rotas and learning groups so parents can fully contribute " +
                           "to food production, health, and infrastructure work.",
                    action: "vacancies",
                },
                {
                    title: "Skills Registrar",
                    why:   "Maintains a live list of who can do what — nursing, plumbing, farming, " +
                           "mechanics, teaching. Essential for mobilising the right person fast " +
                           "when something breaks.",
                    action: "vacancies",
                },
            ],
        },
        {
            id:        "village",
            threshold: 200,
            icon:      "⊞",
            headline:  "Village",
            description:
                "Single leads are now bottlenecks. Stand up small councils for healthcare " +
                "and food — dedicated teams with clear mandates, not volunteers doing their best. " +
                "Infrastructure needs a named owner or it decays.",
            roles: [
                {
                    title: "Healthcare Team (3–5)",
                    why:   "A council covering: primary care, mental health, maternal and infant " +
                           "care, and medical supplies. Should include at least one person with " +
                           "clinical training. Manages the health insurance pool if you're in a " +
                           "federation.",
                    action: "domains",
                },
                {
                    title: "Food Council (3)",
                    why:   "Covers production, preservation/storage, and distribution. Plans for " +
                           "seasonal shortfalls and builds a 90-day food reserve. Coordinates " +
                           "with neighbouring communities on surplus and trade.",
                },
                {
                    title: "Water & Infrastructure Lead",
                    why:   "Owns clean water supply, grey water and sewage, energy systems, and " +
                           "building maintenance. At 200 people, infrastructure decay is a slow " +
                           "emergency — it needs a dedicated owner.",
                    action: "vacancies",
                },
                {
                    title: "Emergency Preparedness Coordinator",
                    why:   "Maintains an emergency response plan, runs drills, and keeps supply " +
                           "caches stocked. Coordinates healthcare, food, and infrastructure leads " +
                           "in a crisis scenario.",
                    action: "vacancies",
                },
                {
                    title: "Finance Officer",
                    why:   "Manages the community bank account, dues, and budget. Reports to the " +
                           "assembly. Distinct from treasurer — this is an operational full-time role.",
                    action: "central-bank",
                },
                {
                    title: "Assembly Clerk",
                    why:   "Facilitates governance meetings, records motions, and maintains the " +
                           "decision log. Governance overhead will swamp volunteers if there's no " +
                           "dedicated person.",
                    action: "vacancies",
                },
            ],
        },
        {
            id:        "township",
            threshold: 500,
            icon:      "⬡",
            headline:  "Township",
            description:
                "You now run real infrastructure. Healthcare needs a functioning clinic. " +
                "Food needs a supply chain. Sanitation needs operators, not volunteers. " +
                "Governance needs formal representation.",
            roles: [
                {
                    title: "Clinic Coordinator",
                    why:   "Manages a functioning clinic: practitioner schedules, patient records, " +
                           "triage protocols, and referral pathways to external care. Not a medical " +
                           "role — an administrative one that makes medical care possible.",
                    action: "domains",
                },
                {
                    title: "Pharmacy & Medical Stores Manager",
                    why:   "Dedicated management of medications, controlled substances, and the " +
                           "supply chain for medical consumables. At 500 people, ad-hoc restocking " +
                           "becomes a liability.",
                    action: "vacancies",
                },
                {
                    title: "Agricultural Manager",
                    why:   "Coordinates land use, crop planning, livestock (if any), and seasonal " +
                           "labour. Responsible for moving toward food sovereignty — producing " +
                           "enough calories locally to survive a supply disruption.",
                },
                {
                    title: "Food Preservation & Distribution Officer",
                    why:   "Manages preservation (canning, fermentation, drying, cold storage) " +
                           "and equitable distribution systems. Ensures nobody goes hungry while " +
                           "surplus is not wasted.",
                },
                {
                    title: "Water Treatment Operator",
                    why:   "A dedicated role for clean water infrastructure — treatment, testing, " +
                           "and maintenance. Safe water at this scale requires technical expertise " +
                           "and consistent operation, not volunteers.",
                },
                {
                    title: "Elected Assembly (5–9)",
                    why:   "Formal proportional representation. Rotate on defined terms. Accountable " +
                           "to the community for all major decisions.",
                    action: "nominations",
                },
                {
                    title: "External Relations Officer",
                    why:   "Maintains relationships with neighbouring communities and manages any " +
                           "federation membership. Trade, mutual aid, and shared infrastructure " +
                           "all need a dedicated negotiator.",
                    action: "connections",
                },
            ],
        },
        {
            id:        "town",
            threshold: 1500,
            icon:      "★",
            headline:  "Town",
            description:
                "At this size the community runs systems that a small city would recognise: " +
                "a hospital wing, a food network, public health surveillance, emergency services. " +
                "Each domain needs a department, not a council.",
            roles: [
                {
                    title: "Chief Medical Officer",
                    why:   "Oversees the full healthcare system: clinic, pharmacy, public health, " +
                           "mental health, and maternal care. Accountable to the assembly for " +
                           "health outcomes across the community.",
                    action: "domains",
                },
                {
                    title: "Public Health Officer",
                    why:   "Tracks disease incidence, runs vaccination and hygiene campaigns, and " +
                           "provides early warning of outbreaks. At 1,500 people an undetected " +
                           "epidemic can reach hundreds before anyone notices.",
                },
                {
                    title: "Food Sovereignty Council (5)",
                    why:   "Governs the full food system: land, production, preservation, " +
                           "distribution, and nutrition policy. Sets targets for local calorie " +
                           "sufficiency and manages trade relationships with the federation.",
                },
                {
                    title: "Emergency Services Director",
                    why:   "Coordinates fire response, emergency medical response, and search-and-rescue. " +
                           "Maintains trained volunteer brigades and equipment. Runs regular drills.",
                    action: "vacancies",
                },
                {
                    title: "Infrastructure Department Lead",
                    why:   "Manages dedicated teams for water, power, waste, roads, and buildings. " +
                           "Produces maintenance schedules and capital plans for the assembly.",
                },
                {
                    title: "Elected Council (9–15)",
                    why:   "Proportional representation across wards or working groups. Holds " +
                           "domain leads accountable. Manages budget and relations with the federation.",
                    action: "nominations",
                },
                {
                    title: "Federation Assembly Delegate",
                    why:   "Attends federation assembly sessions, casts votes on federation motions, " +
                           "and reports back to your council. Essential if you rely on the federation " +
                           "health pool, currency, or mutual aid.",
                    action: "connections",
                },
            ],
        },
        {
            id:        "borough",
            threshold: 5000,
            icon:      "⬟",
            headline:  "Borough",
            description:
                "You are now a significant node in the wider federation. Your systems " +
                "support not just your own members but potentially provide services to " +
                "surrounding communities. Specialisation and formal departments are essential.",
            roles: [
                {
                    title: "Hospital Administration",
                    why:   "Manages a hospital wing or equivalent: inpatient care, surgical capacity, " +
                           "specialist clinics, and emergency intake. Requires professional " +
                           "administration alongside clinical leadership.",
                    action: "domains",
                },
                {
                    title: "Regional Food Network Coordinator",
                    why:   "Manages food trade and mutual aid with neighbouring communities and " +
                           "the federation. Negotiates surplus exchange, maintains strategic " +
                           "reserves, and plans for regional food resilience.",
                },
                {
                    title: "Water Authority Lead",
                    why:   "Runs water treatment and distribution at utility scale — serving your " +
                           "community and potentially neighbours. Manages operators, testing regimes, " +
                           "and capital infrastructure.",
                },
                {
                    title: "Environmental Health Director",
                    why:   "Oversees sanitation, waste processing, air quality, and environmental " +
                           "monitoring. At this scale, environmental failures affect thousands " +
                           "and can undermine everything else.",
                },
                {
                    title: "Education Director",
                    why:   "Coordinates schools, apprenticeships, skills training, and adult " +
                           "education. Knowledge transfer is how the community reproduces its " +
                           "own capacity across generations.",
                },
                {
                    title: "Elected Council (15–25)",
                    why:   "Full proportional democratic governance with standing committees " +
                           "for health, food, infrastructure, finance, and external relations.",
                    action: "nominations",
                },
            ],
        },
    ];

    // ── Derived state ─────────────────────────────────────────────────────────

    /** Index of the milestone the community is currently in */
    const currentMilestoneIndex = $derived(() => {
        let idx = 0;
        for (let i = 0; i < milestones.length; i++) {
            if (memberCount >= milestones[i].threshold) idx = i;
        }
        return idx;
    });

    const nextMilestone = $derived(
        milestones[currentMilestoneIndex() + 1] ?? null
    );

    const membersToNext = $derived(
        nextMilestone ? Math.max(0, nextMilestone.threshold - memberCount) : null
    );

    // ── Nav helper ────────────────────────────────────────────────────────────
    import { currentPage } from "../lib/session.js";
    import type { Page } from "../lib/session.js";

    function navigate(page: string) {
        currentPage.set(page as Page);
    }
</script>

<div class="page">
    <div class="hero">
        <span class="hero-icon">⊛</span>
        <h1>Community Growth Path</h1>
        <p class="subtitle">Roles and responsibilities to fill as your community grows.</p>
    </div>

    {#if loading}
        <div class="loading">Loading…</div>
    {:else if error}
        <div class="error-banner">{error}</div>
    {:else}
        <!-- Current size summary -->
        <div class="size-card">
            <div class="size-number">{memberCount}</div>
            <div class="size-label">members</div>
            {#if membersToNext !== null}
                <div class="size-next">
                    {membersToNext} more to reach
                    <strong>{nextMilestone!.headline}</strong>
                </div>
            {:else}
                <div class="size-next">You've reached the largest planning horizon.</div>
            {/if}
        </div>

        <!-- Milestones -->
        <div class="milestones">
            {#each milestones as m, i (m.id)}
                {@const isCurrent = i === currentMilestoneIndex()}
                {@const isPast    = i < currentMilestoneIndex()}
                {@const isFuture  = i > currentMilestoneIndex()}
                <div class="milestone" class:current={isCurrent} class:past={isPast} class:future={isFuture}>
                    <div class="milestone-header">
                        <div class="milestone-dot" class:done={isPast} class:active={isCurrent}>
                            {#if isPast}✓{:else}{m.icon}{/if}
                        </div>
                        <div class="milestone-meta">
                            <span class="milestone-title">{m.headline}</span>
                            <span class="milestone-threshold">
                                {#if m.threshold === 1}Starting out{:else}{m.threshold}+ members{/if}
                            </span>
                        </div>
                        {#if isCurrent}
                            <span class="current-badge">You are here</span>
                        {/if}
                    </div>

                    {#if !isFuture || i === currentMilestoneIndex() + 1}
                        <div class="milestone-body">
                            <p class="milestone-desc">{m.description}</p>

                            <div class="roles">
                                {#each m.roles as role}
                                    <div class="role-card">
                                        <div class="role-header">
                                            <span class="role-title">{role.title}</span>
                                            {#if role.action}
                                                <button
                                                    class="role-action"
                                                    onclick={() => navigate(role.action!)}
                                                >
                                                    {role.action === "vacancies" ? "Open roles" :
                                                     role.action === "nominations" ? "Nominate" :
                                                     role.action === "domains" ? "Domains" :
                                                     role.action === "connections" ? "Connections" :
                                                     role.action === "central-bank" ? "Bank" : "Go →"}
                                                </button>
                                            {/if}
                                        </div>
                                        <p class="role-why">{role.why}</p>
                                    </div>
                                {/each}
                            </div>
                        </div>
                    {:else}
                        <div class="milestone-collapsed">
                            {m.roles.length} roles — unlocks at {m.threshold} members
                        </div>
                    {/if}
                </div>
            {/each}
        </div>
    {/if}
</div>

<style>
    .page {
        padding: 1.5rem 1.25rem 6rem;
        max-width: 680px;
        margin: 0 auto;
    }

    /* ── Hero ── */
    .hero {
        text-align: center;
        padding: 1.75rem 0 1.25rem;
    }
    .hero-icon {
        font-size: 2.5rem;
        display: block;
        margin-bottom: 0.75rem;
        color: #15803d;
    }
    h1 {
        font-size: 1.55rem;
        font-weight: 700;
        margin: 0 0 0.4rem;
        color: #0f172a;
    }
    .subtitle {
        font-size: 0.95rem;
        color: #64748b;
        margin: 0;
    }

    /* ── Size card ── */
    .size-card {
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 14px;
        padding: 1.25rem 1.5rem;
        margin: 1.25rem 0 1.75rem;
        display: flex;
        align-items: baseline;
        gap: 0.6rem;
        flex-wrap: wrap;
    }
    .size-number {
        font-size: 2.25rem;
        font-weight: 800;
        color: #15803d;
        line-height: 1;
    }
    .size-label {
        font-size: 1rem;
        color: #64748b;
        font-weight: 500;
    }
    .size-next {
        flex-basis: 100%;
        font-size: 0.875rem;
        color: #475569;
        margin-top: 0.25rem;
    }

    /* ── Milestone list ── */
    .milestones {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    .milestone {
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 14px;
        overflow: hidden;
        transition: border-color 0.15s;
    }
    .milestone.current {
        border-color: #86efac;
        box-shadow: 0 0 0 3px #f0fdf4;
    }
    .milestone.past {
        border-color: #d1fae5;
        background: #f0fdf4;
    }
    .milestone.future {
        opacity: 0.55;
    }

    /* ── Milestone header ── */
    .milestone-header {
        display: flex;
        align-items: center;
        gap: 0.875rem;
        padding: 1rem 1.25rem;
    }
    .milestone-dot {
        width: 2.25rem;
        height: 2.25rem;
        border-radius: 50%;
        background: #f1f5f9;
        border: 2px solid #e2e8f0;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.1rem;
        flex-shrink: 0;
        color: #374151;
    }
    .milestone-dot.done {
        background: #dcfce7;
        border-color: #86efac;
        color: #15803d;
        font-weight: 700;
    }
    .milestone-dot.active {
        background: #f0fdf4;
        border-color: #16a34a;
        color: #15803d;
    }
    .milestone-meta {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 0.1rem;
    }
    .milestone-title {
        font-size: 1rem;
        font-weight: 700;
        color: #0f172a;
    }
    .milestone-threshold {
        font-size: 0.78rem;
        color: #64748b;
    }
    .current-badge {
        font-size: 0.72rem;
        font-weight: 700;
        background: #dcfce7;
        color: #15803d;
        border-radius: 999px;
        padding: 0.2rem 0.65rem;
        white-space: nowrap;
        flex-shrink: 0;
    }

    /* ── Milestone body ── */
    .milestone-body {
        padding: 0 1.25rem 1.25rem;
        border-top: 1px solid #f1f5f9;
    }
    .milestone-desc {
        font-size: 0.875rem;
        color: #475569;
        line-height: 1.65;
        margin: 0.875rem 0 1rem;
    }

    /* ── Roles ── */
    .roles {
        display: flex;
        flex-direction: column;
        gap: 0.6rem;
    }
    .role-card {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        padding: 0.75rem 1rem;
    }
    .role-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
        margin-bottom: 0.3rem;
    }
    .role-title {
        font-size: 0.9rem;
        font-weight: 600;
        color: #0f172a;
    }
    .role-action {
        font-size: 0.75rem;
        font-weight: 600;
        color: #15803d;
        background: #f0fdf4;
        border: 1px solid #bbf7d0;
        border-radius: 6px;
        padding: 0.2rem 0.6rem;
        cursor: pointer;
        white-space: nowrap;
        font-family: inherit;
        flex-shrink: 0;
    }
    .role-action:hover { background: #dcfce7; }
    .role-why {
        font-size: 0.825rem;
        color: #64748b;
        line-height: 1.6;
        margin: 0;
    }

    /* ── Collapsed future ── */
    .milestone-collapsed {
        padding: 0.6rem 1.25rem 0.9rem;
        font-size: 0.8rem;
        color: #94a3b8;
        font-style: italic;
        border-top: 1px solid #f1f5f9;
    }

    /* ── Misc ── */
    .loading { text-align: center; color: #94a3b8; padding: 2rem; }
    .error-banner {
        background: #fef2f2;
        border: 1px solid #fecaca;
        color: #b91c1c;
        border-radius: 10px;
        padding: 0.75rem 1rem;
        font-size: 0.875rem;
        margin-bottom: 1rem;
    }
</style>
