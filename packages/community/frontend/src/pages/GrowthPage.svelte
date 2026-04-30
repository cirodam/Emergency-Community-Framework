<script lang="ts">
    import { getEconomics } from "../lib/api.js";
    import { currentPage } from "../lib/session.js";
    import type { Page } from "../lib/session.js";

    let memberCount = $state(0);
    let loading     = $state(true);
    let error       = $state("");

    $effect(() => {
        (async () => {
            loading = true;
            error   = "";
            try {
                const econ = await getEconomics();
                memberCount = econ.demographics?.total ?? 0;
            } catch (e) {
                error = e instanceof Error ? e.message : "Failed to load data";
            } finally {
                loading = false;
            }
        })();
    });

    // ── Staffing priority definitions ─────────────────────────────────────────
    //
    // Roles are numbered in the order a community should fill them.
    // The sequence reflects what matters most for survival and resilience —
    // not population thresholds.

    interface StaffingRole {
        priority: number;
        title:    string;
        why:      string;
        action?:  string;
    }

    interface Phase {
        id:          string;
        headline:    string;
        description: string;
        roles:       StaffingRole[];
    }

    const phases: Phase[] = [
        {
            id:          "day-one",
            headline:    "Day One",
            description:
                "Fill these before anything else. They protect life and prevent the " +
                "most common early failures: hunger, untreated injury, and contaminated water.",
            roles: [
                {
                    priority: 1,
                    title:    "Food Supply Officer",
                    why:      "Tracks pantry and shared larder stock, organises collective purchasing, " +
                              "and knows where the nearest resupply is. Food is the first thing that " +
                              "breaks down when there's no named owner.",
                    action:   "vacancies",
                },
                {
                    priority: 2,
                    title:    "Medical Supply Officer",
                    why:      "Maintains a full inventory of medications, wound care, and diagnostics. " +
                              "Tracks expiry dates, reorders before stock runs out, and knows what " +
                              "can be substituted if resupply fails.",
                    action:   "vacancies",
                },
                {
                    priority: 3,
                    title:    "Water & Sanitation Monitor",
                    why:      "Checks drinking water safety, manages hygiene supplies, and watches " +
                              "for contamination or waste issues. Disease spreads through water and " +
                              "sanitation failures faster than almost anything else.",
                    action:   "vacancies",
                },
                {
                    priority: 4,
                    title:    "First Aid Officer",
                    why:      "Maintains the group's medical kit, knows who has clinical training, " +
                              "and is the first call when someone is hurt or ill. Does not need to " +
                              "be a doctor — just prepared and reachable.",
                    action:   "vacancies",
                },
                {
                    priority: 5,
                    title:    "Steward / Convenor",
                    why:      "Calls meetings, collects decisions, and is the point of contact. " +
                              "Doesn't need to be a leader — just a reliable anchor who makes sure " +
                              "nothing falls through the cracks.",
                },
            ],
        },
        {
            id:          "health",
            headline:    "Health",
            description:
                "Once supplies are tracked, build the care system. Clinical roles have long " +
                "lead times — if you have practitioners in your community, get them into " +
                "named positions early.",
            roles: [
                {
                    priority: 6,
                    title:    "Doctor",
                    why:      "Primary point of care: diagnosis, treatment, triage, and referrals. " +
                              "Coordinates any other practitioners and tracks the health status of " +
                              "vulnerable members.",
                    action:   "vacancies",
                },
                {
                    priority: 7,
                    title:    "Nurse",
                    why:      "Delivers day-to-day patient care, wound management, medication " +
                              "administration, and health monitoring. The backbone of any clinic.",
                    action:   "vacancies",
                },
                {
                    priority: 8,
                    title:    "Mental Health Counselor",
                    why:      "Displacement and crisis generate significant psychological strain. " +
                              "A named counselor normalises help-seeking before problems become acute.",
                    action:   "vacancies",
                },
                {
                    priority: 9,
                    title:    "Midwife",
                    why:      "Prenatal care, birth attendance, and postnatal support. Communities " +
                              "with families cannot rely on hospital access — this role must exist locally.",
                    action:   "vacancies",
                },
            ],
        },
        {
            id:          "food",
            headline:    "Food System",
            description:
                "Move beyond purchasing toward production and preservation. A supply chain " +
                "you don't control is a single point of failure.",
            roles: [
                {
                    priority: 10,
                    title:    "Food Production Lead",
                    why:      "Plans and oversees growing, foraging, or sourcing food — not just " +
                              "purchasing. Maintains gardens, seed stock, and relationships with " +
                              "local growers.",
                    action:   "vacancies",
                },
                {
                    priority: 11,
                    title:    "Community Kitchen Coordinator",
                    why:      "Organises collective cooking, meal planning, and shared food " +
                              "distribution. Ensures equitable access and reduces individual " +
                              "household burden.",
                    action:   "vacancies",
                },
                {
                    priority: 12,
                    title:    "Food Preservation & Storage Officer",
                    why:      "Manages preservation (canning, fermentation, drying, cold storage) " +
                              "and builds the community's food reserve. A 90-day buffer is the " +
                              "minimum viable safety margin.",
                    action:   "vacancies",
                },
                {
                    priority: 13,
                    title:    "Agricultural Manager",
                    why:      "Coordinates land use, crop planning, livestock (if any), and seasonal " +
                              "labour. Drives toward food sovereignty — enough local calories to " +
                              "survive a supply disruption.",
                },
            ],
        },
        {
            id:          "infrastructure",
            headline:    "Infrastructure & Coordination",
            description:
                "Name the people responsible for systems that break slowly. Infrastructure " +
                "decay and coordination failures are silent — they only become visible when " +
                "they've already caused harm.",
            roles: [
                {
                    priority: 14,
                    title:    "Sanitation & Waste Lead",
                    why:      "Manages composting, waste disposal, and sewage. Poor sanitation is " +
                              "the most likely vector for a disease outbreak once a community " +
                              "reaches a few dozen people.",
                    action:   "vacancies",
                },
                {
                    priority: 15,
                    title:    "Childcare Coordinator",
                    why:      "Organises care rotas and learning groups so parents can fully " +
                              "contribute to food production, health, and infrastructure work.",
                    action:   "vacancies",
                },
                {
                    priority: 16,
                    title:    "Skills Registrar",
                    why:      "Maintains a live list of who can do what — nursing, plumbing, " +
                              "farming, mechanics, teaching. Essential for mobilising the right " +
                              "person fast when something breaks.",
                    action:   "vacancies",
                },
                {
                    priority: 17,
                    title:    "Water & Infrastructure Lead",
                    why:      "Owns clean water supply, grey water and sewage, energy systems, " +
                              "and building maintenance. Infrastructure decay is a slow emergency " +
                              "— it needs a dedicated owner.",
                    action:   "vacancies",
                },
                {
                    priority: 18,
                    title:    "Emergency Preparedness Coordinator",
                    why:      "Maintains an emergency response plan, runs drills, and keeps supply " +
                              "caches stocked. Coordinates healthcare, food, and infrastructure " +
                              "leads in a crisis scenario.",
                    action:   "vacancies",
                },
            ],
        },
        {
            id:          "governance",
            headline:    "Governance & Finance",
            description:
                "Formalise coordination and accountability. These roles don't prevent " +
                "immediate crises — but without them, decisions drift and trust erodes.",
            roles: [
                {
                    priority: 19,
                    title:    "Finance Officer",
                    why:      "Manages the community bank account, dues, and budget. Reports to " +
                              "the assembly. Distinct from a treasurer — this is an operational " +
                              "full-time role.",
                    action:   "central-bank",
                },
                {
                    priority: 20,
                    title:    "Assembly Clerk",
                    why:      "Facilitates governance meetings, records motions, and maintains the " +
                              "decision log. Governance overhead will swamp volunteers if there's " +
                              "no dedicated person.",
                    action:   "vacancies",
                },
                {
                    priority: 21,
                    title:    "Elected Assembly",
                    why:      "Formal proportional representation. Rotate on defined terms. " +
                              "Accountable to the community for all major decisions including " +
                              "budget, external relations, and domain leads.",
                    action:   "nominations",
                },
                {
                    priority: 22,
                    title:    "External Relations Officer",
                    why:      "Maintains relationships with neighbouring communities and manages " +
                              "federation membership. Trade, mutual aid, and shared infrastructure " +
                              "all need a dedicated negotiator.",
                    action:   "connections",
                },
            ],
        },
        {
            id:          "scale",
            headline:    "At Scale",
            description:
                "As your community grows, operational roles need to split from clinical and " +
                "coordination roles. Each domain needs a manager, not just a practitioner.",
            roles: [
                {
                    priority: 23,
                    title:    "Clinic Coordinator",
                    why:      "Manages a functioning clinic: practitioner schedules, patient " +
                              "records, triage protocols, and referral pathways. Not a medical " +
                              "role — an administrative one that makes medical care possible.",
                    action:   "domains",
                },
                {
                    priority: 24,
                    title:    "Pharmacy & Medical Stores Manager",
                    why:      "Dedicated management of medications, controlled substances, and " +
                              "the supply chain for medical consumables. Ad-hoc restocking " +
                              "becomes a liability past a few hundred people.",
                    action:   "vacancies",
                },
                {
                    priority: 25,
                    title:    "Public Health Officer",
                    why:      "Tracks disease incidence, runs vaccination and hygiene campaigns, " +
                              "and provides early warning of outbreaks. At scale, an undetected " +
                              "epidemic can reach hundreds before anyone notices.",
                },
                {
                    priority: 26,
                    title:    "Emergency Services Director",
                    why:      "Coordinates fire response, emergency medical response, and " +
                              "search-and-rescue. Maintains trained volunteer brigades and " +
                              "equipment. Runs regular drills.",
                    action:   "vacancies",
                },
                {
                    priority: 27,
                    title:    "Chief Medical Officer",
                    why:      "Oversees the full healthcare system: clinic, pharmacy, public " +
                              "health, mental health, and maternal care. Accountable to the " +
                              "assembly for health outcomes.",
                    action:   "domains",
                },
                {
                    priority: 28,
                    title:    "Food Sovereignty Council",
                    why:      "Governs the full food system: land, production, preservation, " +
                              "distribution, and nutrition policy. Sets targets for local calorie " +
                              "sufficiency and manages trade relationships with the federation.",
                },
            ],
        },
    ];

    const totalRoles = phases.reduce((n, p) => n + p.roles.length, 0);

    function navigate(page: string) {
        currentPage.go(page as Page);
    }
</script>

<div class="page">
    <div class="hero">
        <span class="hero-icon">⊛</span>
        <h1>Staffing Priority Order</h1>
        <p class="subtitle">Fill these {totalRoles} roles in order. The sequence reflects what matters most for survival and resilience.</p>
    </div>

    {#if loading}
        <div class="loading">Loading…</div>
    {:else if error}
        <div class="error-banner">{error}</div>
    {:else}
        <div class="member-bar">
            <span class="member-count">{memberCount}</span>
            <span class="member-label">members</span>
        </div>

        <div class="phases">
            {#each phases as phase (phase.id)}
                <div class="phase">
                    <div class="phase-header">
                        <span class="phase-headline">{phase.headline}</span>
                    </div>
                    <p class="phase-desc">{phase.description}</p>
                    <div class="roles">
                        {#each phase.roles as role}
                            <div class="role-card">
                                <div class="role-header">
                                    <span class="role-priority">{role.priority}</span>
                                    <span class="role-title">{role.title}</span>
                                    {#if role.action}
                                        <button
                                            class="role-action"
                                            onclick={() => navigate(role.action ?? "")}
                                        >
                                            {role.action === "vacancies"    ? "Open roles"  :
                                             role.action === "nominations"  ? "Nominate"    :
                                             role.action === "domains"      ? "Domains"     :
                                             role.action === "connections"  ? "Connections" :
                                             role.action === "central-bank" ? "Bank"        : "Go →"}
                                        </button>
                                    {/if}
                                </div>
                                <p class="role-why">{role.why}</p>
                            </div>
                        {/each}
                    </div>
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

    /* ── Member bar ── */
    .member-bar {
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 14px;
        padding: 1rem 1.5rem;
        margin: 1.25rem 0 1.75rem;
        display: flex;
        align-items: baseline;
        gap: 0.6rem;
    }
    .member-count {
        font-size: 2.25rem;
        font-weight: 800;
        color: #15803d;
        line-height: 1;
    }
    .member-label {
        font-size: 1rem;
        color: #64748b;
        font-weight: 500;
    }

    /* ── Phase list ── */
    .phases {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
    }

    .phase {
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 14px;
        overflow: hidden;
        padding: 1.25rem;
    }

    .phase-header {
        margin-bottom: 0.5rem;
    }
    .phase-headline {
        font-size: 1rem;
        font-weight: 700;
        color: #0f172a;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        font-size: 0.78rem;
        color: #15803d;
    }
    .phase-desc {
        font-size: 0.875rem;
        color: #475569;
        line-height: 1.65;
        margin: 0 0 1rem;
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
        gap: 0.6rem;
        margin-bottom: 0.3rem;
    }
    .role-priority {
        font-size: 0.7rem;
        font-weight: 800;
        color: #fff;
        background: #15803d;
        border-radius: 50%;
        width: 1.5rem;
        height: 1.5rem;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        font-variant-numeric: tabular-nums;
    }
    .role-title {
        font-size: 0.9rem;
        font-weight: 600;
        color: #0f172a;
        flex: 1;
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
        padding-left: 2.1rem;
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
