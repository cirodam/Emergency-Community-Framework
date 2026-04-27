import { FunctionalDomain, type BudgetItem } from "./common/domain/FunctionalDomain.js";
import { FunctionalUnit } from "./common/domain/FunctionalUnit.js";
import { FunctionalDomainLoader } from "./common/domain/FunctionalDomainLoader.js";
import { FunctionalUnitLoader } from "./common/domain/FunctionalUnitLoader.js";
import { CommunityRole } from "./common/CommunityRole.js";
import { CommunityRoleLoader } from "./common/domain/CommunityRoleLoader.js";
import { RoleType } from "./common/RoleType.js";
import { RoleTypeLoader } from "./common/RoleTypeLoader.js";
import { LeaderPool } from "./governance/LeaderPool.js";
import { LeaderPoolLoader } from "./governance/LeaderPoolLoader.js";
import { BankClient } from "./BankClient.js";

/**
 * DomainService is the single source of truth for the community's operational structure.
 * It holds flat registries of domains, units, roles, and pools and owns all payroll logic.
 *
 * Domains are code-defined singletons — they must be registered via registerDomain()
 * during startup, after which their persisted state is restored from FunctionalDomainLoader.
 */
export class DomainService {
    private static instance: DomainService;

    private domains: Map<string, FunctionalDomain> = new Map();
    private units:     Map<string, FunctionalUnit>   = new Map();
    private roles:     Map<string, CommunityRole>    = new Map();
    private roleTypes: Map<string, RoleType>         = new Map();
    private pools:     Map<string, LeaderPool>       = new Map();

    private domainLoader:   FunctionalDomainLoader | null = null;
    private unitLoader:     FunctionalUnitLoader   | null = null;
    private roleLoader:     CommunityRoleLoader    | null = null;
    private roleTypeLoader: RoleTypeLoader         | null = null;
    private poolLoader:     LeaderPoolLoader       | null = null;

    private constructor() {}

    static getInstance(): DomainService {
        if (!DomainService.instance) DomainService.instance = new DomainService();
        return DomainService.instance;
    }

    // ── Startup ───────────────────────────────────────────────────────────────

    init(
        domainLoader: FunctionalDomainLoader,
        unitLoader:   FunctionalUnitLoader,
        roleLoader:   CommunityRoleLoader,
        poolLoader:   LeaderPoolLoader,
    ): void {
        this.domainLoader = domainLoader;
        this.unitLoader   = unitLoader;
        this.roleLoader   = roleLoader;
        this.poolLoader   = poolLoader;

        for (const unit of unitLoader.loadAll())   this.units.set(unit.id, unit);
        for (const role of roleLoader.loadAll())   this.roles.set(role.id, role);
        for (const pool of poolLoader.loadAll())   this.pools.set(pool.id, pool);
    }

    initRoleTypes(loader: RoleTypeLoader): void {
        this.roleTypeLoader = loader;
        for (const rt of loader.loadAll()) this.roleTypes.set(rt.id, rt);
        console.log(`[DomainService] loaded ${this.roleTypes.size} role type(s)`);
    }

    /**
     * Register a code-defined domain singleton and restore its persisted state.
     * Call once per domain during startup, after init().
     */
    registerDomain(domain: FunctionalDomain): void {
        this.domainLoader?.restore(domain);
        this.domains.set(domain.id, domain);
    }

    // ── Domains ───────────────────────────────────────────────────────────────

    getDomain(id: string): FunctionalDomain | undefined { return this.domains.get(id); }
    getDomains(): FunctionalDomain[] { return Array.from(this.domains.values()); }

    // ── Units ─────────────────────────────────────────────────────────────────

    getUnit(id: string): FunctionalUnit | undefined { return this.units.get(id); }
    getUnits(): FunctionalUnit[] { return Array.from(this.units.values()); }

    getUnitsForDomain(domainId: string): FunctionalUnit[] {
        const domain = this.domains.get(domainId);
        if (!domain) return [];
        return domain.unitIds.flatMap(id => {
            const u = this.units.get(id);
            return u ? [u] : [];
        });
    }

    createUnit(unit: FunctionalUnit, domainId: string): void {
        this.units.set(unit.id, unit);
        this.unitLoader?.save(unit);
        const domain = this.domains.get(domainId);
        if (domain) {
            domain.unitIds.push(unit.id);
            this.domainLoader?.save(domain);
        }
    }

    saveUnit(unit: FunctionalUnit): void {
        this.unitLoader?.save(unit);
    }

    deleteUnit(id: string): boolean {
        const unit = this.units.get(id);
        if (!unit) return false;
        this.units.delete(id);
        this.unitLoader?.delete(id);
        for (const domain of this.domains.values()) {
            const idx = domain.unitIds.indexOf(id);
            if (idx !== -1) {
                domain.unitIds.splice(idx, 1);
                this.domainLoader?.save(domain);
            }
        }
        return true;
    }

    // ── Roles (unit slots) ────────────────────────────────────────────────────

    getRole(id: string): CommunityRole | undefined { return this.roles.get(id); }
    getRoles(): CommunityRole[] { return Array.from(this.roles.values()); }

    getRolesForUnit(unitId: string): CommunityRole[] {
        const unit = this.units.get(unitId);
        if (!unit) return [];
        return unit.roleIds.flatMap(id => {
            const r = this.roles.get(id);
            return r ? [r] : [];
        });
    }

    createRole(role: CommunityRole, unitId: string): void {
        this.roles.set(role.id, role);
        this.roleLoader?.save(role);
        const unit = this.units.get(unitId);
        if (unit) {
            unit.roleIds.push(role.id);
            this.unitLoader?.save(unit);
        }
    }

    saveRole(role: CommunityRole): void {
        this.roleLoader?.save(role);
    }

    deleteRole(id: string): boolean {
        if (!this.roles.has(id)) return false;
        this.roles.delete(id);
        this.roleLoader?.delete(id);
        for (const unit of this.units.values()) {
            const idx = unit.roleIds.indexOf(id);
            if (idx !== -1) {
                unit.roleIds.splice(idx, 1);
                this.unitLoader?.save(unit);
            }
        }
        return true;
    }

    // ── Role Types (the bank) ─────────────────────────────────────────────────

    getRoleType(id: string): RoleType | undefined { return this.roleTypes.get(id); }
    getRoleTypes(): RoleType[] { return Array.from(this.roleTypes.values()); }

    /** Returns true if the bank already contains a type with this exact title (case-insensitive). */
    hasRoleTypeWithTitle(title: string): boolean {
        const lower = title.toLowerCase();
        return [...this.roleTypes.values()].some(rt => rt.title.toLowerCase() === lower);
    }

    createRoleType(roleType: RoleType): void {
        this.roleTypes.set(roleType.id, roleType);
        this.roleTypeLoader?.save(roleType);
    }

    saveRoleType(roleType: RoleType): void {
        this.roleTypeLoader?.save(roleType);
    }

    deleteRoleType(id: string): boolean {
        if (!this.roleTypes.has(id)) return false;
        this.roleTypes.delete(id);
        this.roleTypeLoader?.delete(id);
        return true;
    }

    // ── Budget ────────────────────────────────────────────────────────────────

    /**
     * Compute the full budget for a domain:
     * - payroll: derived from all role slots across all units in the domain
     * - items: the domain's manually-added line items (supplies, equipment, etc.)
     */
    getDomainBudget(domainId: string): {
        payroll: { roleId: string; title: string; memberId: string | null; kinPerMonth: number }[];
        items: BudgetItem[];
        totals: { payroll: number; items: number; total: number };
    } | null {
        const domain = this.domains.get(domainId);
        if (!domain) return null;

        const payroll = domain.unitIds.flatMap(unitId => {
            const unit = this.units.get(unitId);
            if (!unit) return [];
            return unit.roleIds.flatMap(roleId => {
                const role = this.roles.get(roleId);
                if (!role) return [];
                return [{ roleId: role.id, title: role.title, memberId: role.memberId, kinPerMonth: role.kinPerMonth }];
            });
        });

        const payrollTotal = payroll.reduce((sum, r) => sum + r.kinPerMonth, 0);
        const itemsTotal   = domain.budgetItems.reduce((sum, i) => sum + i.amount, 0);

        return {
            payroll,
            items: domain.budgetItems,
            totals: { payroll: payrollTotal, items: itemsTotal, total: payrollTotal + itemsTotal },
        };
    }

    addBudgetItem(domainId: string, item: Omit<BudgetItem, "id">): BudgetItem | null {
        const domain = this.domains.get(domainId);
        if (!domain) return null;
        const newItem: BudgetItem = { id: crypto.randomUUID(), ...item };
        domain.budgetItems.push(newItem);
        this.domainLoader?.save(domain);
        return newItem;
    }

    updateBudgetItem(domainId: string, itemId: string, patch: Partial<Omit<BudgetItem, "id">>): BudgetItem | null {
        const domain = this.domains.get(domainId);
        if (!domain) return null;
        const item = domain.budgetItems.find(i => i.id === itemId);
        if (!item) return null;
        if (patch.label    !== undefined) item.label    = patch.label;
        if (patch.amount   !== undefined) item.amount   = patch.amount;
        if (patch.category !== undefined) item.category = patch.category;
        if (patch.note     !== undefined) item.note     = patch.note;
        this.domainLoader?.save(domain);
        return item;
    }

    removeBudgetItem(domainId: string, itemId: string): boolean {
        const domain = this.domains.get(domainId);
        if (!domain) return false;
        const idx = domain.budgetItems.findIndex(i => i.id === itemId);
        if (idx === -1) return false;
        domain.budgetItems.splice(idx, 1);
        this.domainLoader?.save(domain);
        return true;
    }

    /**
     * Aggregate the budgets of every registered domain into a community-wide view.
     * Suitable for the public /api/budget endpoint.
     */
    getCommunityBudget(): {
        domains: Array<{
            domainId:   string;
            domainName: string;
            payroll:    { roleId: string; title: string; memberId: string | null; kinPerMonth: number }[];
            items:      BudgetItem[];
            totals:     { payroll: number; items: number; total: number };
        }>;
        totals: { payroll: number; items: number; total: number };
    } {
        let totalPayroll = 0;
        let totalItems   = 0;

        const domains = Array.from(this.domains.values()).map(domain => {
            const payroll = domain.unitIds.flatMap(unitId => {
                const unit = this.units.get(unitId);
                if (!unit) return [];
                return unit.roleIds.flatMap(roleId => {
                    const role = this.roles.get(roleId);
                    if (!role) return [];
                    return [{ roleId: role.id, title: role.title, memberId: role.memberId, kinPerMonth: role.kinPerMonth }];
                });
            });

            const payrollTotal = payroll.reduce((sum, r) => sum + r.kinPerMonth, 0);
            const itemsTotal   = domain.budgetItems.reduce((sum, i) => sum + i.amount, 0);

            totalPayroll += payrollTotal;
            totalItems   += itemsTotal;

            return {
                domainId:   domain.id,
                domainName: domain.name,
                payroll,
                items:   domain.budgetItems,
                totals:  { payroll: payrollTotal, items: itemsTotal, total: payrollTotal + itemsTotal },
            };
        });

        return {
            domains,
            totals: { payroll: totalPayroll, items: totalItems, total: totalPayroll + totalItems },
        };
    }

    // ── Pools ─────────────────────────────────────────────────────────────────

    getPool(id: string): LeaderPool | undefined { return this.pools.get(id); }
    getPools(): LeaderPool[] { return Array.from(this.pools.values()); }

    createPool(pool: LeaderPool): void {
        this.pools.set(pool.id, pool);
        this.poolLoader?.save(pool);
    }

    savePool(pool: LeaderPool): void {
        this.poolLoader?.save(pool);
    }

    deletePool(id: string): boolean {
        if (!this.pools.has(id)) return false;
        this.pools.delete(id);
        this.poolLoader?.delete(id);
        // Clear poolId on any domain referencing this pool
        for (const domain of this.domains.values()) {
            if (domain.poolId === id) {
                domain.poolId = null;
                this.domainLoader?.save(domain);
            }
        }
        return true;
    }

    // ── Payroll ───────────────────────────────────────────────────────────────

    /**
     * Pay all active roles in a domain (domain-level roles then each unit's roles)
     * from their respective bank accounts via the BankClient.
     */
    async payDomainMonthly(domainId: string, bank: BankClient): Promise<void> {
        const domain = this.domains.get(domainId);
        if (!domain) throw new Error(`Domain ${domainId} not found`);

        for (const unitId of domain.unitIds) {
            const unit = this.units.get(unitId);
            if (!unit) continue;
            await this._payRoles(unit.id, unit.roleIds, bank);
        }
    }

    private async _payRoles(payerId: string, roleIds: string[], bank: BankClient): Promise<void> {
        const payerAccount = await bank.getPrimaryAccountAsync(payerId);
        if (!payerAccount) return;

        let remaining = payerAccount.amount;
        for (const roleId of roleIds) {
            const role = this.roles.get(roleId);
            if (!role || !role.isActive() || !role.memberId) continue;
            const amount = Math.round(role.kinPerMonth * 100) / 100;
            if (amount <= 0) continue;
            if (remaining < amount) {
                console.warn(`[DomainService] cannot afford payroll for "${role.title}" (needs ${amount}, has ${remaining})`);
                continue;
            }
            const recipientAccount = await bank.getPrimaryAccountAsync(role.memberId);
            if (!recipientAccount) {
                console.warn(`[DomainService] no primary account for role holder ${role.memberId} ("${role.title}")`);
                continue;
            }
            await bank.transfer(payerAccount.accountId, recipientAccount.accountId, amount, `payroll: ${role.title}`);
            remaining -= amount;
        }
    }
}
