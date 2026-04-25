import { FunctionalDomain } from "./common/domain/FunctionalDomain.js";
import { FunctionalUnit } from "./common/domain/FunctionalUnit.js";
import { FunctionalDomainLoader } from "./common/domain/FunctionalDomainLoader.js";
import { FunctionalUnitLoader } from "./common/domain/FunctionalUnitLoader.js";
import { CommunityRole } from "./common/CommunityRole.js";
import { CommunityRoleLoader } from "./common/domain/CommunityRoleLoader.js";
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
    private units:   Map<string, FunctionalUnit>   = new Map();
    private roles:   Map<string, CommunityRole>    = new Map();
    private pools:   Map<string, LeaderPool>        = new Map();

    private domainLoader: FunctionalDomainLoader | null = null;
    private unitLoader:   FunctionalUnitLoader   | null = null;
    private roleLoader:   CommunityRoleLoader    | null = null;
    private poolLoader:   LeaderPoolLoader       | null = null;

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

    // ── Roles ─────────────────────────────────────────────────────────────────

    getRole(id: string): CommunityRole | undefined { return this.roles.get(id); }
    getRoles(): CommunityRole[] { return Array.from(this.roles.values()); }

    getRolesForDomain(domainId: string): CommunityRole[] {
        const domain = this.domains.get(domainId);
        if (!domain) return [];
        return domain.roleIds.flatMap(id => {
            const r = this.roles.get(id);
            return r ? [r] : [];
        });
    }

    getRolesForUnit(unitId: string): CommunityRole[] {
        const unit = this.units.get(unitId);
        if (!unit) return [];
        return unit.roleIds.flatMap(id => {
            const r = this.roles.get(id);
            return r ? [r] : [];
        });
    }

    createRole(role: CommunityRole, parentId: string, parentType: "domain" | "unit"): void {
        this.roles.set(role.id, role);
        this.roleLoader?.save(role);
        if (parentType === "domain") {
            const domain = this.domains.get(parentId);
            if (domain) {
                domain.roleIds.push(role.id);
                this.domainLoader?.save(domain);
            }
        } else {
            const unit = this.units.get(parentId);
            if (unit) {
                unit.roleIds.push(role.id);
                this.unitLoader?.save(unit);
            }
        }
    }

    saveRole(role: CommunityRole): void {
        this.roleLoader?.save(role);
    }

    deleteRole(id: string): boolean {
        if (!this.roles.has(id)) return false;
        this.roles.delete(id);
        this.roleLoader?.delete(id);
        for (const domain of this.domains.values()) {
            const idx = domain.roleIds.indexOf(id);
            if (idx !== -1) {
                domain.roleIds.splice(idx, 1);
                this.domainLoader?.save(domain);
            }
        }
        for (const unit of this.units.values()) {
            const idx = unit.roleIds.indexOf(id);
            if (idx !== -1) {
                unit.roleIds.splice(idx, 1);
                this.unitLoader?.save(unit);
            }
        }
        return true;
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

        await this._payRoles(domain.id, domain.roleIds, bank);

        for (const unitId of domain.unitIds) {
            const unit = this.units.get(unitId);
            if (!unit) continue;
            await this._payRoles(unit.id, unit.roleIds, bank);
        }
    }

    private async _payRoles(payerId: string, roleIds: string[], bank: BankClient): Promise<void> {
        const payerAccount = await bank.getPrimaryAccountAsync(payerId);
        if (!payerAccount) return;

        let remaining = payerAccount.kin;
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
            await bank.transfer(payerAccount.id, recipientAccount.id, "kin", amount, `payroll: ${role.title}`);
            remaining -= amount;
        }
    }
}
