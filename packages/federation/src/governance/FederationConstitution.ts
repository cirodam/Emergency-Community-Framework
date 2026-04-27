import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

// ── Types ──────────────────────────────────────────────────────────────────────

export type FederationParameterAuthority = "immutable" | "charter" | "council" | "assembly";

export interface FederationParameter<T extends number | boolean> {
    readonly value:       T;
    readonly authority:   FederationParameterAuthority;
    readonly description: string;
    readonly constraints?: { min?: number; max?: number };
}

export interface FederationConstitutionDocument {
    version:        number;
    adoptedAt:      string;
    federationName: string;
    parameters:     Record<string, FederationParameter<number | boolean>>;
}

// ── Defaults ──────────────────────────────────────────────────────────────────

export const DEFAULT_FEDERATION_CONSTITUTION: FederationConstitutionDocument = {
    version:        1,
    adoptedAt:      new Date().toISOString(),
    federationName: "Federation",
    parameters: {

        // ── Foundational guarantees ──────────────────────────────────────────
        memberSovereigntyProtected: {
            value:       true,
            authority:   "immutable",
            description: "Member communities retain full sovereignty over their internal governance.",
        },
        openMembership: {
            value:       true,
            authority:   "charter",
            description: "Any community meeting the federation charter criteria may apply for membership.",
        },

        // ── Levy ─────────────────────────────────────────────────────────────
        /**
         * Kithe collected from each member community's federation account per period.
         * Flows into the Federation Treasury to fund federation operations.
         */
        memberLevyAmount: {
            value:       500,
            authority:   "assembly",
            description: "Kithe levied from each member community per levy period.",
            constraints: { min: 0, max: 100_000 },
        },
        memberLevyPeriodDays: {
            value:       30,
            authority:   "assembly",
            description: "Number of days between member levy collections.",
            constraints: { min: 1, max: 365 },
        },

        // ── Budget allocations (as fractions of treasury balance per period) ──
        /**
         * Fraction of treasury earmarked for the federation reinsurance pool.
         * When a member community's insurance pool is depleted it can draw here.
         */
        reinsurancePoolRatio: {
            value:       0.30,
            authority:   "assembly",
            description: "Fraction of treasury balance allocated to the inter-community reinsurance pool.",
            constraints: { min: 0, max: 1 },
        },
        /**
         * Fraction of treasury earmarked for federation operations (staff, infrastructure).
         */
        operationsRatio: {
            value:       0.40,
            authority:   "council",
            description: "Fraction of treasury balance allocated to federation operations.",
            constraints: { min: 0, max: 1 },
        },
        /**
         * Fraction of treasury earmarked for mutual aid grants to member communities
         * experiencing acute hardship.
         */
        mutualAidRatio: {
            value:       0.30,
            authority:   "assembly",
            description: "Fraction of treasury balance allocated for mutual aid disbursements to member communities.",
            constraints: { min: 0, max: 1 },
        },

        // ── Insurance ─────────────────────────────────────────────────────────
        /**
         * Maximum claim amount that can be auto-approved by an insurance society
         * without requiring a council review.
         */
        maxAutoApprovedClaim: {
            value:       1_000,
            authority:   "council",
            description: "Maximum kithe claim amount that may be approved automatically without council review.",
            constraints: { min: 0, max: 1_000_000 },
        },
        /**
         * Minimum pool balance (as a multiple of the max auto-approved claim) before
         * the insurance society triggers a reinsurance request to the federation treasury.
         */
        reinsuranceTriggerMultiple: {
            value:       5,
            authority:   "council",
            description: "Insurance pool balance floor, expressed as a multiple of maxAutoApprovedClaim. Below this, a reinsurance drawdown is requested.",
            constraints: { min: 1, max: 100 },
        },
    },
};

// ── Singleton ─────────────────────────────────────────────────────────────────

export class FederationConstitution {
    private static instance: FederationConstitution;
    private doc!: FederationConstitutionDocument;
    private filePath!: string;

    private constructor() {}

    static getInstance(): FederationConstitution {
        if (!FederationConstitution.instance) FederationConstitution.instance = new FederationConstitution();
        return FederationConstitution.instance;
    }

    load(dataDir: string): void {
        mkdirSync(dataDir, { recursive: true });
        this.filePath = join(dataDir, "federation_constitution.json");

        if (existsSync(this.filePath)) {
            const persisted = JSON.parse(readFileSync(this.filePath, "utf-8")) as FederationConstitutionDocument;
            // Merge: persisted values win for existing parameters; defaults fill new ones
            this.doc = {
                ...DEFAULT_FEDERATION_CONSTITUTION,
                ...persisted,
                parameters: {
                    ...DEFAULT_FEDERATION_CONSTITUTION.parameters,
                    ...persisted.parameters,
                },
            };
        } else {
            this.doc = { ...DEFAULT_FEDERATION_CONSTITUTION, adoptedAt: new Date().toISOString() };
            this.save();
        }
    }

    private save(): void {
        writeFileSync(this.filePath, JSON.stringify(this.doc, null, 2), "utf-8");
    }

    private get<T extends number | boolean>(key: string): T {
        const param = this.doc.parameters[key];
        if (!param) throw new Error(`FederationConstitution: unknown parameter "${key}"`);
        return param.value as T;
    }

    // ── Typed getters ─────────────────────────────────────────────────────────

    get memberSovereigntyProtected(): boolean { return this.get<boolean>("memberSovereigntyProtected"); }
    get openMembership(): boolean             { return this.get<boolean>("openMembership"); }
    get memberLevyAmount(): number            { return this.get<number>("memberLevyAmount"); }
    get memberLevyPeriodDays(): number        { return this.get<number>("memberLevyPeriodDays"); }
    get reinsurancePoolRatio(): number        { return this.get<number>("reinsurancePoolRatio"); }
    get operationsRatio(): number             { return this.get<number>("operationsRatio"); }
    get mutualAidRatio(): number              { return this.get<number>("mutualAidRatio"); }
    get maxAutoApprovedClaim(): number        { return this.get<number>("maxAutoApprovedClaim"); }
    get reinsuranceTriggerMultiple(): number  { return this.get<number>("reinsuranceTriggerMultiple"); }

    /** Compute the budget allocation for the current treasury balance. */
    budget(treasuryBalance: number): { reinsurancePool: number; operations: number; mutualAid: number } {
        return {
            reinsurancePool: Math.floor(treasuryBalance * this.reinsurancePoolRatio),
            operations:      Math.floor(treasuryBalance * this.operationsRatio),
            mutualAid:       Math.floor(treasuryBalance * this.mutualAidRatio),
        };
    }

    /** Return all parameters as a serialisable object for API responses. */
    toJSON(): FederationConstitutionDocument {
        return this.doc;
    }
}
