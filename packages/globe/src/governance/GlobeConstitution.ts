import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

export type GlobeParameterAuthority = "immutable" | "charter" | "council" | "assembly";

export interface GlobeParameter<T extends number | boolean> {
    readonly value:       T;
    readonly authority:   GlobeParameterAuthority;
    readonly description: string;
    readonly constraints?: { min?: number; max?: number };
}

export interface GlobeConstitutionDocument {
    version:    number;
    adoptedAt:  string;
    globeName:  string;
    parameters: Record<string, GlobeParameter<number | boolean>>;
}

export const DEFAULT_GLOBE_CONSTITUTION: GlobeConstitutionDocument = {
    version:   1,
    adoptedAt: new Date().toISOString(),
    globeName: "Globe",
    parameters: {

        // ── Foundational ──────────────────────────────────────────────────────
        memberSovereigntyProtected: {
            value:       true,
            authority:   "immutable",
            description: "Member commonwealths retain full sovereignty over their internal governance.",
        },
        openMembership: {
            value:       true,
            authority:   "charter",
            description: "Any commonwealth meeting the globe charter criteria may apply for membership.",
        },

        // ── Clearing ──────────────────────────────────────────────────────────
        clearingFeeRate: {
            value:       0.0005,
            authority:   "assembly",
            description: "Fraction of each inter-commonwealth transfer taken as a clearing fee (0.0005 = 0.05%). Mutual-aid transfers are exempt.",
            constraints: { min: 0, max: 0.01 },
        },
        creditLineKinPerPerson: {
            value:       500,
            authority:   "assembly",
            description: "Maximum kin deficit per commonwealth resident, used to compute each commonwealth's credit line.",
            constraints: { min: 0, max: 100_000 },
        },
        surplusThresholdMultiple: {
            value:       2,
            authority:   "assembly",
            description: "Multiple of a commonwealth's credit line above which its balance is subject to demurrage.",
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
            description: "Fraction of demurrage charges routed to the solidarity pool for redistribution to deficit commonwealths (0.5 = 50%).",
            constraints: { min: 0, max: 1 },
        },

        // ── Budget allocations ────────────────────────────────────────────────
        catastrophicAidRatio: {
            value:       0.40,
            authority:   "assembly",
            description: "Fraction of treasury balance allocated for catastrophic aid disbursements to member commonwealths (climate events, planetary emergencies).",
            constraints: { min: 0, max: 1 },
        },
        operationsRatio: {
            value:       0.20,
            authority:   "council",
            description: "Fraction of treasury balance allocated to globe operations.",
            constraints: { min: 0, max: 1 },
        },
        planetaryCommonsRatio: {
            value:       0.40,
            authority:   "assembly",
            description: "Fraction of treasury balance allocated to planetary-commons investment (climate, open science, shared infrastructure).",
            constraints: { min: 0, max: 1 },
        },
    },
};

export class GlobeConstitution {
    private static instance: GlobeConstitution;
    private doc!: GlobeConstitutionDocument;
    private filePath!: string;

    private constructor() {}

    static getInstance(): GlobeConstitution {
        if (!GlobeConstitution.instance) GlobeConstitution.instance = new GlobeConstitution();
        return GlobeConstitution.instance;
    }

    load(dataDir: string): void {
        mkdirSync(dataDir, { recursive: true });
        this.filePath = join(dataDir, "globe_constitution.json");

        if (existsSync(this.filePath)) {
            const persisted = JSON.parse(readFileSync(this.filePath, "utf-8")) as GlobeConstitutionDocument;
            this.doc = {
                ...DEFAULT_GLOBE_CONSTITUTION,
                ...persisted,
                parameters: {
                    ...DEFAULT_GLOBE_CONSTITUTION.parameters,
                    ...persisted.parameters,
                },
            };
        } else {
            this.doc = { ...DEFAULT_GLOBE_CONSTITUTION, adoptedAt: new Date().toISOString() };
            this.save();
        }
    }

    private save(): void {
        writeFileSync(this.filePath, JSON.stringify(this.doc, null, 2), "utf-8");
    }

    private get<T extends number | boolean>(key: string): T {
        const param = this.doc.parameters[key];
        if (!param) throw new Error(`GlobeConstitution: unknown parameter "${key}"`);
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
    get planetaryCommonsRatio(): number       { return this.get<number>("planetaryCommonsRatio"); }

    budget(treasuryBalance: number): { catastrophicAid: number; operations: number; planetaryCommons: number } {
        return {
            catastrophicAid: Math.floor(treasuryBalance * this.catastrophicAidRatio),
            operations:      Math.floor(treasuryBalance * this.operationsRatio),
            planetaryCommons: Math.floor(treasuryBalance * this.planetaryCommonsRatio),
        };
    }

    toJSON(): GlobeConstitutionDocument {
        return this.doc;
    }
}
