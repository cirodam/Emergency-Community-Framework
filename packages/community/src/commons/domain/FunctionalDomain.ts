import { randomUUID } from "crypto";
import { IEconomicActor } from "@ecf/core";

export interface BudgetLineItem {
    label: string;
    amount: number;
}

export interface DomainBudget {
    lineItems: BudgetLineItem[];
    total: number;
}

/**
 * Base class for all functional domains (Food, Healthcare, Childcare, etc.).
 *
 * Each domain represents the community's mandate for a function. Domains are defined
 * in code (name, description, type come from subclass constructors). Only the mutable
 * relationships — unitIds, roleIds, poolId — are persisted by FunctionalDomainLoader.
 *
 * Payroll and budget logic live in DomainService, which holds the flat registries
 * for all roles and units and can resolve IDs to objects.
 */
export abstract class FunctionalDomain implements IEconomicActor {
    readonly id: string;
    readonly name: string;
    readonly description: string;

    unitIds: string[] = [];
    roleIds: string[] = [];

    /** The leader pool that governs this domain (if any). */
    poolId: string | null = null;

    constructor(name: string, description: string = "", id?: string) {
        this.id = id ?? randomUUID();
        this.name = name;
        this.description = description;
    }

    getId(): string { return this.id; }
    getDisplayName(): string { return this.name; }
    getHandle(): string { return this.name.toLowerCase().replace(/[^a-z0-9_]/g, "_"); }
}
