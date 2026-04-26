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
    version:       number;
    adoptedAt:     string;
    communityName: string;
    parameters:    Record<string, ConstitutionalParameter<number | boolean>>;
    amendments:    ConstitutionAmendment[];
    authorityMap:  ActionAuthority[];
}

// ── Defaults ──────────────────────────────────────────────────────────────────

export const DEFAULT_CONSTITUTION: ConstitutionDocument = {
    version:       1,
    adoptedAt:     new Date().toISOString(),
    communityName: "My Community",
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
                "Balance floor below which no demurrage is charged. Only the portion of an account balance above this threshold is subject to the levy or bank demurrage. Protects small balances from being eroded.",
            constraints: { min: 0, max: 5_000 },
        },

        // ── Community levy ──────────────────────────────────────────────────
        communityLevyRate: {
            value: 0.01,
            authority: "referendum",
            description:
                "Monthly rate collected from every member's primary account into the community treasury. Functions as community dues — kin is not retired, it moves from members to the shared budget. Applied after Central Bank demurrage.",
            constraints: { min: 0, max: 0.10 },
        },

        // ── Social insurance ─────────────────────────────────────────────────
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
    },
    amendments: [],
    authorityMap: [
        { action: "admit-member",            body: "assembly",   description: "Admitting a new member to the community" },
        { action: "suspend-member",          body: "assembly",   description: "Suspending a member pending review" },
        { action: "exclude-member",          body: "referendum", description: "Permanently excluding a member" },
        { action: "change-levy-rate",        body: "referendum", description: "Changing the commons levy rate" },
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

// ── Constitution singleton ────────────────────────────────────────────────────

export class Constitution {
    private static instance: Constitution;
    private doc: ConstitutionDocument = {
        ...DEFAULT_CONSTITUTION,
        amendments:   [],
        authorityMap: [...DEFAULT_CONSTITUTION.authorityMap],
    };

    private constructor() {}

    static getInstance(): Constitution {
        if (!Constitution.instance) Constitution.instance = new Constitution();
        return Constitution.instance;
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
        };
    }

    get version(): number       { return this.doc.version; }
    get adoptedAt(): string     { return this.doc.adoptedAt; }
    get communityName(): string { return this.doc.communityName ?? "Community"; }

    setCommunityName(name: string): void {
        this.doc = { ...this.doc, communityName: name };
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
    get retirementAge(): number                { return this.get<number>("retirementAge"); }
    get retirementPayoutRate(): number         { return this.get<number>("retirementPayoutRate"); }
    get birthdayCirculationFraction(): number  { return this.get<number>("birthdayCirculationFraction"); }
    get communityLevyRate(): number             { return this.get<number>("communityLevyRate"); }
    get endowmentPoolFraction(): number        { return this.get<number>("endowmentPoolFraction"); }
    get endowmentSeedBalance(): number         { return this.get<number>("endowmentSeedBalance"); }

    /** Which governance body must authorize the given action. Returns null if not in the map. */
    getRequiredBody(action: string): GovernanceBody | null {
        return this.doc.authorityMap.find(a => a.action === action)?.body ?? null;
    }

    get authorityMap(): readonly ActionAuthority[] { return this.doc.authorityMap; }
}
