import { type DocumentArticle, extractParamKeys } from "../common/DocumentFramework.js";

// ── Types ─────────────────────────────────────────────────────────────────────

export type ParameterAuthority = "immutable" | "referendum" | "assembly" | "council" | "commonwealth";

export type GovernanceBody = "council" | "assembly" | "referendum";

export enum VoteThreshold {
    SIMPLE_MAJORITY = "SIMPLE_MAJORITY",
    SUPERMAJORITY   = "SUPERMAJORITY",
    NEAR_CONSENSUS  = "NEAR_CONSENSUS",
}

export interface ActionAuthority {
    readonly action:      string;
    readonly body:        GovernanceBody;
    readonly description: string;
}

export interface ConstitutionalParameter<T extends number | boolean> {
    readonly value:        T;
    readonly authority:    ParameterAuthority;
    readonly description:  string;
    readonly constraints?: { min?: number; max?: number };
}

export interface ConstitutionAmendment {
    readonly version:    number;
    readonly parameter:  string;
    readonly oldValue:   number | boolean;
    readonly newValue:   number | boolean;
    readonly proposalId: string;
    readonly amendedAt:  string; // ISO 8601
}

export interface ConstitutionDocument {
    version:         number;
    adoptedAt:       string;
    communityName:   string;
    /** URL-safe handle used to identify this community within a federation.
     *  Lowercase letters, digits, and hyphens only. Must be set before applying
     *  to join a federation. Unique within a given federation. */
    communityHandle: string;
    parameters:      Record<string, ConstitutionalParameter<number | boolean>>;
    amendments:      ConstitutionAmendment[];
    authorityMap:    ActionAuthority[];
    /** Structured document body: articles containing sections with {paramKey} prose slots. */
    articles:        DocumentArticle[];
}

// ── Defaults ──────────────────────────────────────────────────────────────────

export const DEFAULT_CONSTITUTION: ConstitutionDocument = {
    version:       1,
    adoptedAt:     new Date().toISOString(),
    communityName:   "My Community",
    communityHandle: "",
    parameters: {

        // ── Axioms — unit definitions, never changeable ──────────────────────
        kinPerPersonYear: {
            value: 10_000,
            authority: "immutable",
            description:
                "Kin issued per person-year of presence. This is a unit definition — 1 kin = 1/10,000 person-year — not a policy choice. All human years are valued equally.",
        },

        // ── Fundamental guarantees ───────────────────────────────────────────
        universalFloorGuaranteed: {
            value: true,
            authority: "immutable",
            description: "Every member receives basic needs support unconditionally.",
        },
        membershipUnconditional: {
            value: true,
            authority: "immutable",
            description: "Belonging is not contingent on productive capacity.",
        },
        dataPortabilityGuaranteed: {
            value: true,
            authority: "immutable",
            description: "Members can always take their data and leave.",
        },
        ledgerTransparent: {
            value: true,
            authority: "immutable",
            description: "All kin flows are visible to all members.",
        },
        democraticMinimumProtected: {
            value: true,
            authority: "immutable",
            description: "Governance cannot be captured by any individual or group.",
        },
        dueProcessGuaranteed: {
            value: true,
            authority: "immutable",
            description:
                "No member may have their membership suspended, revoked, or materially restricted without notice, a stated reason, and an opportunity to respond before the decision takes effect.",
        },
        noExPostFacto: {
            value: true,
            authority: "immutable",
            description:
                "No rule change may be applied retroactively to penalise conduct that was permitted at the time it occurred.",
        },
        rightOfAppeal: {
            value: true,
            authority: "immutable",
            description:
                "Any member subject to an adverse governance decision has the right to appeal it to an independent body before it takes permanent effect.",
        },

        // ── Vote thresholds ──────────────────────────────────────────────────
        thresholdSimpleMajority: {
            value: 0.51,
            authority: "referendum",
            description: "Fraction of total members required to pass a simple majority proposal.",
            constraints: { min: 0.51, max: 0.66 },
        },
        thresholdSupermajority: {
            value: 0.67,
            authority: "referendum",
            description: "Fraction of total members required to pass a supermajority proposal.",
            constraints: { min: 0.60, max: 0.80 },
        },
        thresholdNearConsensus: {
            value: 0.90,
            authority: "referendum",
            description: "Fraction of total members required to pass a near-consensus proposal.",
            constraints: { min: 0.80, max: 1.00 },
        },

        // ── Governance process ───────────────────────────────────────────────
        assemblySeatCount: {
            value: 99,
            authority: "assembly",
            description: "Number of members drawn by sortition to form the assembly for a given term.",
            constraints: { min: 9, max: 999 },
        },
        deliberationPeriodDays: {
            value: 3,
            authority: "assembly",
            description: "Minimum days before a proposal vote can close.",
            constraints: { min: 1, max: 30 },
        },

        // ── Monetary policy ──────────────────────────────────────────────────
        bankDemurrageRate: {
            value: 0.02,
            authority: "referendum",
            description:
                "Monthly rate at which the Central Bank applies demurrage to recover unanchored kin.",
            constraints: { min: 0, max: 0.10 },
        },
        demurrageFloor: {
            value: 1_000,
            authority: "referendum",
            description:
                "Balance floor below which no demurrage is charged. Only the portion of an account balance above this threshold is subject to dues or bank demurrage. Protects small balances from being eroded.",
            constraints: { min: 0, max: 5_000 },
        },

        // ── Community dues ───────────────────────────────────────────────────
        communityDuesRate: {
            value: 0.01,
            authority: "referendum",
            description:
                "Monthly rate collected from every member's primary account into the community treasury as community dues — kin is not retired, it moves from members to the shared budget. Applied after Central Bank demurrage.",
            constraints: { min: 0, max: 0.10 },
        },

        // ── Social insurance ─────────────────────────────────────────────────
        workingAgeMin: {
            value: 16,
            authority: "referendum",
            description:
                "Minimum age at which a community member is considered part of the working-age population. Used for demographic reporting and role eligibility.",
            constraints: { min: 14, max: 21 },
        },
        retirementAge: {
            value: 65,
            authority: "referendum",
            description:
                "Age at which a member becomes eligible for monthly retirement payments from the social insurance pool.",
            constraints: { min: 55, max: 75 },
        },
        retirementPayoutRate: {
            value: 0.005,
            authority: "referendum",
            description:
                "Fraction of the retirement pool distributed each month across all current retirees.",
            constraints: { min: 0.001, max: 0.02 },
        },
        birthdayCirculationFraction: {
            value: 0.20,
            authority: "referendum",
            description:
                "Fraction of each annual person-year issuance (kinPerPersonYear) paid directly to the member's primary account as circulating kin. The remainder goes to the social insurance retirement pool.",
            constraints: { min: 0, max: 0.5 },
        },
        endowmentPoolFraction: {
            value: 0.80,
            authority: "referendum",
            description:
                "Fraction of a new member's join endowment (age × kinPerPersonYear) directed into the social insurance retirement pool. The remaining fraction is split between the member's seed balance and the community treasury.",
            constraints: { min: 0.50, max: 0.95 },
        },
        endowmentSeedBalance: {
            value: 1_000,
            authority: "referendum",
            description:
                "Fixed kin issued directly to a new member's primary account on joining. Grounds the member's perception of scale. Taken from the circulating fraction of the join endowment; the remainder goes to the community treasury.",
            constraints: { min: 0, max: 10_000 },
        },
        birthGrant: {
            value: 500,
            authority: "referendum",
            description:
                "Fixed kin issued to the community fund when a person is born into the community, then forwarded to the newborn's account as a welcome grant. Unlike the join endowment (which compensates for prior years of life), the birth grant simply marks the start of a new member's kin journey. The community fund receives it first so the flow is transparent and consistent with policy.",
            constraints: { min: 0, max: 5_000 },
        },

        // ── Membership admission ─────────────────────────────────────────────
        memberAdmissionVouchesRequired: {
            value: 3,
            authority: "assembly",
            description:
                "Number of existing member vouches required to automatically admit a membership applicant. Once this many distinct members vouch for an application it is admitted without further action.",
            constraints: { min: 1, max: 10 },
        },

        // ── Stewardship ──────────────────────────────────────────────────────
        stewardshipThresholdYears: {
            value: 3,
            authority: "assembly",
            description:
                "Years of continuous membership after which a person automatically becomes a steward, gaining access to administrative actions (password resets, disabling members, etc.). Stewardship can also be granted explicitly by an existing steward at any time.",
            constraints: { min: 1, max: 20 },
        },
    },
    amendments: [],
    articles: [],   // populated below after DEFAULT_ARTICLES is declared
    authorityMap: [
        { action: "admit-member",            body: "assembly",   description: "Admitting a new member to the community" },
        { action: "suspend-member",          body: "assembly",   description: "Suspending a member pending review" },
        { action: "exclude-member",          body: "referendum", description: "Permanently excluding a member" },
        { action: "change-dues-rate",         body: "referendum", description: "Changing the community dues rate" },
        { action: "change-demurrage-rate",   body: "referendum", description: "Changing the bank demurrage rate" },
        { action: "change-demurrage-floor",  body: "referendum", description: "Changing the demurrage-free balance floor" },
        { action: "amend-constitution",      body: "referendum", description: "Amending the constitution" },
        { action: "join-federation",         body: "referendum", description: "Joining a federation" },
        { action: "leave-federation",        body: "referendum", description: "Leaving a federation" },
        { action: "split-council",           body: "assembly",   description: "Splitting a multi-domain council into two" },
        { action: "allocate-domain-budget",  body: "assembly",   description: "Setting budget envelopes for domains" },
        { action: "declare-domain-emergency",body: "council",    description: "Declaring a domain emergency (assembly ratifies within 72h)" },
        { action: "change-market-schedule",  body: "council",    description: "Changing market day schedule" },
        { action: "enact-domain-statute",    body: "council",    description: "Enacting an operating rule within a domain" },
    ],
};

// ── Default Articles ─────────────────────────────────────────────────────────

const DEFAULT_ARTICLES: DocumentArticle[] = [
    {
        number: "I",
        title: "Founding Principles",
        sections: [
            {
                id: "I.1",
                title: "Why We Are Here",
                body: "Most of us grew up believing that if we worked hard and played by the rules, our basic needs would be met. For a great many people, that has not proven true. Work no longer guarantees security. Housing costs more than families can afford. Healthcare goes without because the price is too high. Neighbors who need help find that the systems meant to provide it are distant, difficult, and insufficient. These are not personal failures — they are shared experiences, felt across communities of every background. We are not the first to notice, and we are not naive about the difficulty of change. But we believe that people who choose to meet their needs together, in full view of one another, can do better than institutions that have forgotten who they were built to serve. This community is that attempt.",
                paramKeys: [],
                amendAuthority: "referendum",
            },
            {
                id: "I.2",
                title: "Human Dignity",
                body: "Every person has worth that is not contingent on their productivity, their health, their age, or any other measure of economic usefulness. A person who cannot work has the same claim on a dignified life as anyone else. A community that withholds basic necessities from people who fail to contribute economically has not balanced its books — it has betrayed its purpose. This community holds human dignity as prior to economic participation. No member's standing within it is earned. It is given.",
                paramKeys: [],
                amendAuthority: "referendum",
            },
            {
                id: "I.3",
                title: "Economy in Service of People",
                body: "An economy is a tool for coordinating how people meet their needs. An economy that denies cancer treatment to keep a claims ratio low, that leaves veterans on the street, that will not feed children despite producing enough food to waste half of it — that economy has not merely developed flaws. It has failed at its only legitimate purpose. The economy of this community exists to meet the needs of its members. That is the measure by which every economic decision here will be judged.",
                paramKeys: [],
                amendAuthority: "referendum",
            },
            {
                id: "I.4",
                title: "Scope",
                body: "This constitution governs the internal affairs of this community. It does not claim authority over any person who has not chosen membership, and it does not override any rights a member holds as a person beyond this community. It is not a complete theory of society — it is an agreement among people who have chosen to meet their needs together.",
                paramKeys: [],
                amendAuthority: "referendum",
            },
        ],
    },
    {
        number: "II",
        title: "Governance",
        sections: [
            {
                id: "II.1",
                title: "The Source of Authority",
                body: "Legitimate authority in this community comes from the whole community, not from the ability to win an election. No person or group holds permanent authority here. Every decision is made by the community, in whole or in part.",
                paramKeys: [],
                amendAuthority: "referendum",
            },
            {
                id: "II.2",
                title: "The Assembly",
                body: "The assembly is the highest governing body of this community. It is composed of {assemblySeatCount} members drawn by sortition from the full membership for a fixed term. Any member may be drawn. The assembly sets policy, ratifies significant decisions, and holds all other bodies accountable. When its term ends, a new assembly is drawn.",
                paramKeys: ["assemblySeatCount"],
                amendAuthority: "referendum",
            },
            {
                id: "II.3",
                title: "Sortition",
                body: "Leadership roles are filled by random draw from the relevant pool. The person selected serves for a fixed term, then returns to ordinary membership. A cooling-off period follows before they may serve in the same role again. This ensures that authority circulates through the community rather than accumulating in the hands of those who seek it most.",
                paramKeys: [],
                amendAuthority: "referendum",
            },
            {
                id: "II.4",
                title: "Leader Pools",
                body: "Any member may join the pool of candidates for a leadership role by declaring their willingness to serve. No campaign, no election, no endorsement is required or permitted. The pool is simply the set of people who have said: I am willing.",
                paramKeys: [],
                amendAuthority: "referendum",
            },

        ],
    },
    {
        number: "III",
        title: "Economics",
        sections: [
            {
                id: "III.1",
                title: "The Kin",
                body: "The unit of account for this community is the kin. It is grounded in the most basic thing all members share: the years of their lives. One kin represents one ten-thousandth of a person-year — 10,000 kin to a year.\n\nMost currencies are backed by government decree, by gold, or by debt. The kin is backed by something more direct: the community itself and the lives of the people in it.",
                paramKeys: [],
                amendAuthority: "referendum",
            },
            {
                id: "III.2",
                title: "The Banks",
                body: "This community operates two financial institutions. The Community Bank holds member accounts — it is where kin is stored, sent, and received. The Central Bank manages monetary policy — it issues new kin and applies the holding fee. All flows through both institutions are visible to every member. There are no hidden charges and no hidden balances.",
                paramKeys: [],
                amendAuthority: "referendum",
            },
            {
                id: "III.3",
                title: "The Holding Fee",
                body: "To discourage hoarding and keep kin moving through the community, the Central Bank applies a monthly holding fee of {bankDemurrageRate} to all account balances above {demurrageFloor} kin. Only the portion above this floor is subject to the fee. Balances at or below {demurrageFloor} kin are never charged.",
                paramKeys: ["bankDemurrageRate", "demurrageFloor"],
                amendAuthority: "referendum",
            },
            {
                id: "III.4",
                title: "Community Dues",
                body: "Each month, {communityDuesRate} of every member's primary balance above {demurrageFloor} kin is transferred to the community treasury as dues. This kin is not destroyed — it funds the shared budget we all depend on.",
                paramKeys: ["communityDuesRate", "demurrageFloor"],
                amendAuthority: "referendum",
            },
        ],
    },
];

DEFAULT_CONSTITUTION.articles = DEFAULT_ARTICLES;

// ── Constitution singleton ────────────────────────────────────────────────────

/** Minimal interface so Constitution doesn't depend on the loader class. */
export interface ConstitutionSaver {
    save(): void;
}

export class Constitution {
    private static instance: Constitution;
    private doc: ConstitutionDocument = {
        ...DEFAULT_CONSTITUTION,
        amendments:   [],
        authorityMap: [...DEFAULT_CONSTITUTION.authorityMap],
    };
    private _saver: ConstitutionSaver | null = null;

    private constructor() {}

    static getInstance(): Constitution {
        if (!Constitution.instance) Constitution.instance = new Constitution();
        return Constitution.instance;
    }

    /** Register the loader so handlers can call save() without knowing DATA_DIR. */
    init(saver: ConstitutionSaver): void {
        this._saver = saver;
    }

    /** Persist the current document via the registered loader. */
    save(): void {
        if (!this._saver) throw new Error("Constitution.init() must be called before save()");
        this._saver.save();
    }

    /**
     * Load a persisted document. Parameters from the persisted document take
     * precedence over defaults, but any parameters present in the defaults
     * that are absent from the persisted document (i.e. added in a newer code
     * version) are kept so the node doesn't crash on first boot after an upgrade.
     */
    load(doc: ConstitutionDocument): void {
        this.doc = {
            ...doc,
            parameters: { ...this.doc.parameters, ...doc.parameters },
            // Keep default articles when loading an older persisted doc that predates articles
            articles: doc.articles?.length ? doc.articles : this.doc.articles,
        };
    }

    /** Update the prose body of a section, re-extracting its paramKeys. */
    updateSection(sectionId: string, body: string): void {
        for (const article of this.doc.articles) {
            const section = article.sections.find(s => s.id === sectionId);
            if (section) {
                section.body = body.trim();
                section.paramKeys = extractParamKeys(body);
                return;
            }
        }
        throw new Error(`Section "${sectionId}" not found`);
    }

    get version(): number       { return this.doc.version; }
    get adoptedAt(): string     { return this.doc.adoptedAt; }
    get communityName(): string   { return this.doc.communityName ?? "Community"; }
    get communityHandle(): string  { return this.doc.communityHandle ?? ""; }

    setCommunityName(name: string): void {
        this.doc = { ...this.doc, communityName: name };
    }

    /** Set the community's federation handle. Validated: lowercase alphanumeric + hyphens,
     *  no leading/trailing hyphens, 2–32 characters. */
    setCommunityHandle(handle: string): void {
        const h = handle.toLowerCase().trim();
        if (!/^[a-z0-9][a-z0-9-]{0,30}[a-z0-9]$|^[a-z0-9]{1,2}$/.test(h)) {
            throw new Error(
                `Invalid community handle "${handle}". Use 2–32 characters: lowercase letters, digits, hyphens (no leading/trailing hyphens).`,
            );
        }
        this.doc = { ...this.doc, communityHandle: h };
    }

    get amendments(): readonly ConstitutionAmendment[] { return this.doc.amendments; }

    toDocument(): ConstitutionDocument { return this.doc; }

    /** Read a parameter's current value. Throws if unknown. */
    get<T extends number | boolean>(key: string): T {
        const param = this.doc.parameters[key];
        if (!param) throw new Error(`Unknown constitutional parameter: "${key}"`);
        return param.value as T;
    }

    getParameter(key: string): ConstitutionalParameter<number | boolean> {
        const param = this.doc.parameters[key];
        if (!param) throw new Error(`Unknown constitutional parameter: "${key}"`);
        return param;
    }

    getAll(): Record<string, ConstitutionalParameter<number | boolean>> {
        return { ...this.doc.parameters };
    }

    /**
     * Amend a mutable parameter. Called by GovernanceService after a proposal passes.
     * Throws if the parameter is immutable or out of constraints.
     */
    amend(key: string, newValue: number | boolean, proposalId: string): void {
        const param = this.doc.parameters[key];
        if (!param) throw new Error(`Unknown constitutional parameter: "${key}"`);
        if (param.authority === "immutable") {
            throw new Error(`Parameter "${key}" is immutable — it is a unit definition, not a policy choice.`);
        }
        if (typeof newValue === "number" && param.constraints) {
            const { min, max } = param.constraints;
            if (min !== undefined && newValue < min)
                throw new Error(`Value ${newValue} is below the minimum (${min}) for "${key}"`);
            if (max !== undefined && newValue > max)
                throw new Error(`Value ${newValue} exceeds the maximum (${max}) for "${key}"`);
        }

        const amendment: ConstitutionAmendment = {
            version:   this.doc.version + 1,
            parameter: key,
            oldValue:  param.value,
            newValue,
            proposalId,
            amendedAt: new Date().toISOString(),
        };

        (this.doc.parameters[key] as { value: number | boolean }).value = newValue;
        this.doc.version = amendment.version;
        this.doc.amendments.push(amendment);
    }

    // ── Convenience getters ──────────────────────────────────────────────────

    get thresholds(): Record<VoteThreshold, number> {
        return {
            [VoteThreshold.SIMPLE_MAJORITY]: this.get<number>("thresholdSimpleMajority"),
            [VoteThreshold.SUPERMAJORITY]:   this.get<number>("thresholdSupermajority"),
            [VoteThreshold.NEAR_CONSENSUS]:  this.get<number>("thresholdNearConsensus"),
        };
    }

    get deliberationPeriodDays(): number       { return this.get<number>("deliberationPeriodDays"); }
    get bankDemurrageRate(): number            { return this.get<number>("bankDemurrageRate"); }
    get demurrageFloor(): number               { return this.get<number>("demurrageFloor"); }
    get kinPerPersonYear(): number             { return this.get<number>("kinPerPersonYear"); }
    get workingAgeMin(): number                { return this.get<number>("workingAgeMin"); }
    get retirementAge(): number                { return this.get<number>("retirementAge"); }
    get retirementPayoutRate(): number         { return this.get<number>("retirementPayoutRate"); }
    get birthdayCirculationFraction(): number  { return this.get<number>("birthdayCirculationFraction"); }
    get communityDuesRate(): number             { return this.get<number>("communityDuesRate"); }
    get endowmentPoolFraction(): number        { return this.get<number>("endowmentPoolFraction"); }
    get endowmentSeedBalance(): number         { return this.get<number>("endowmentSeedBalance"); }
    get birthGrant(): number                   { return this.get<number>("birthGrant"); }
    get memberAdmissionVouchesRequired(): number { return this.get<number>("memberAdmissionVouchesRequired"); }
    get stewardshipThresholdYears(): number       { return this.get<number>("stewardshipThresholdYears"); }

    /** Which governance body must authorize the given action. Returns null if not in the map. */
    getRequiredBody(action: string): GovernanceBody | null {
        return this.doc.authorityMap.find(a => a.action === action)?.body ?? null;
    }

    get authorityMap(): readonly ActionAuthority[] { return this.doc.authorityMap; }
}
