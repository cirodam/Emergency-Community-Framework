import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

export type CommonwealthParameterAuthority = "immutable" | "charter" | "council" | "assembly";

export interface CommonwealthParameter<T extends number | boolean> {
    readonly value:       T;
    readonly authority:   CommonwealthParameterAuthority;
    readonly description: string;
    readonly constraints?: { min?: number; max?: number };
}

export interface CommonwealthConstitutionDocument {
    version:           number;
    adoptedAt:         string;
    commonwealthName:  string;
    parameters:        Record<string, CommonwealthParameter<number | boolean>>;
}

export const DEFAULT_COMMONWEALTH_CONSTITUTION: CommonwealthConstitutionDocument = {
    version:          1,
    adoptedAt:        new Date().toISOString(),
    commonwealthName: "Commonwealth",
    parameters: {

        // ── Foundational ──────────────────────────────────────────────────────
        memberSovereigntyProtected: {
            value:       true,
            authority:   "immutable",
            description: "Member federations retain full sovereignty over their internal governance.",
        },
        openMembership: {
            value:       true,
            authority:   "charter",
            description: "Any federation meeting the commonwealth charter criteria may apply for membership.",
        },

        // ── Clearing ──────────────────────────────────────────────────────────
        clearingFeeRate: {
            value:       0.001,
            authority:   "assembly",
            description: "Fraction of each inter-federation transfer taken as a clearing fee (0.001 = 0.1%). Mutual-aid transfers are exempt.",
            constraints: { min: 0, max: 0.02 },
        },
        creditLineKinPerPerson: {
            value:       500,
            authority:   "assembly",
            description: "Maximum kin deficit per federation resident, used to compute each federation's credit line.",
            constraints: { min: 0, max: 100_000 },
        },
        surplusThresholdMultiple: {
            value:       2,
            authority:   "assembly",
            description: "Multiple of a federation's credit line above which its balance is subject to demurrage.",
            constraints: { min: 1, max: 100 },
        },
        surplusDemurrageRate: {
            value:       0.005,
            authority:   "assembly",
            description: "Monthly demurrage rate on balances above the surplus threshold (0.005 = 0.5%).",
            constraints: { min: 0, max: 0.05 },
        },
        solidarityPoolFraction: {
            value:       0.5,
            authority:   "assembly",
            description: "Fraction of demurrage charges routed to the solidarity pool for redistribution to deficit federations (0.5 = 50%).",
            constraints: { min: 0, max: 1 },
        },

        // ── Budget allocations ────────────────────────────────────────────────
        /**
         * Fraction of treasury earmarked for catastrophic aid — disaster relief,
         * large-scale migration events, federation health reinsurance draws.
         */
        catastrophicAidRatio: {
            value:       0.40,
            authority:   "assembly",
            description: "Fraction of treasury balance allocated for catastrophic aid disbursements to member federations.",
            constraints: { min: 0, max: 1 },
        },
        operationsRatio: {
            value:       0.20,
            authority:   "council",
            description: "Fraction of treasury balance allocated to commonwealth operations.",
            constraints: { min: 0, max: 1 },
        },
        /**
         * Fraction earmarked for global-commons investment: climate, science,
         * infrastructure that benefits all member federations.
         */
        commonsInvestmentRatio: {
            value:       0.40,
            authority:   "assembly",
            description: "Fraction of treasury balance allocated to global-commons investment (climate, science, shared infrastructure).",
            constraints: { min: 0, max: 1 },
        },

    },
};

export class CommonwealthConstitution {
    private static instance: CommonwealthConstitution;
    private doc!: CommonwealthConstitutionDocument;
    private filePath!: string;

    private constructor() {}

    static getInstance(): CommonwealthConstitution {
        if (!CommonwealthConstitution.instance) CommonwealthConstitution.instance = new CommonwealthConstitution();
        return CommonwealthConstitution.instance;
    }

    load(dataDir: string): void {
        mkdirSync(dataDir, { recursive: true });
        this.filePath = join(dataDir, "commonwealth_constitution.json");

        if (existsSync(this.filePath)) {
            const persisted = JSON.parse(readFileSync(this.filePath, "utf-8")) as CommonwealthConstitutionDocument;
            this.doc = {
                ...DEFAULT_COMMONWEALTH_CONSTITUTION,
                ...persisted,
                parameters: {
                    ...DEFAULT_COMMONWEALTH_CONSTITUTION.parameters,
                    ...persisted.parameters,
                },
            };
        } else {
            this.doc = { ...DEFAULT_COMMONWEALTH_CONSTITUTION, adoptedAt: new Date().toISOString() };
            this.save();
        }
    }

    private save(): void {
        writeFileSync(this.filePath, JSON.stringify(this.doc, null, 2), "utf-8");
    }

    private get<T extends number | boolean>(key: string): T {
        const param = this.doc.parameters[key];
        if (!param) throw new Error(`CommonwealthConstitution: unknown parameter "${key}"`);
        return param.value as T;
    }

    get memberSovereigntyProtected(): boolean { return this.get<boolean>("memberSovereigntyProtected"); }
    get openMembership(): boolean             { return this.get<boolean>("openMembership"); }
    get clearingFeeRate(): number             { return this.get<number>("clearingFeeRate"); }
    get creditLineKinPerPerson(): number      { return this.get<number>("creditLineKinPerPerson"); }
    get surplusThresholdMultiple(): number    { return this.get<number>("surplusThresholdMultiple"); }
    get surplusDemurrageRate(): number        { return this.get<number>("surplusDemurrageRate"); }
    get solidarityPoolFraction(): number      { return this.get<number>("solidarityPoolFraction"); }
    get catastrophicAidRatio(): number        { return this.get<number>("catastrophicAidRatio"); }
    get operationsRatio(): number             { return this.get<number>("operationsRatio"); }
    get commonsInvestmentRatio(): number      { return this.get<number>("commonsInvestmentRatio"); }

    budget(treasuryBalance: number): { catastrophicAid: number; operations: number; commonsInvestment: number } {
        return {
            catastrophicAid:   Math.floor(treasuryBalance * this.catastrophicAidRatio),
            operations:        Math.floor(treasuryBalance * this.operationsRatio),
            commonsInvestment: Math.floor(treasuryBalance * this.commonsInvestmentRatio),
        };
    }

    toJSON(): CommonwealthConstitutionDocument {
        return this.doc;
    }
}
