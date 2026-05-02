import logger from "../logger.js";
import { Nomination } from "./Nomination.js";
import { NominationLoader } from "./NominationLoader.js";
import { DomainService } from "../DomainService.js";

export class NominationService {
    private static instance: NominationService;
    private nominations: Map<string, Nomination> = new Map();
    private loader: NominationLoader | null = null;

    private constructor() {}

    static getInstance(): NominationService {
        if (!NominationService.instance) NominationService.instance = new NominationService();
        return NominationService.instance;
    }

    init(loader: NominationLoader): void {
        this.loader = loader;
        for (const n of loader.loadAll()) {
            this.nominations.set(n.id, n);
        }
        logger.info(`[NominationService] loaded ${this.nominations.size} nomination(s)`);
    }

    // ── Queries ────────────────────────────────────────────────────────────

    getAll(): Nomination[] {
        return Array.from(this.nominations.values());
    }

    getById(id: string): Nomination | undefined {
        return this.nominations.get(id);
    }

    getPending(): Nomination[] {
        return this.getAll().filter(n => n.status === "pending");
    }

    getForRole(roleId: string): Nomination[] {
        return this.getAll().filter(n => n.roleId === roleId);
    }

    /** Returns roles that are vacant (no memberId) across all domains/units. */
    getVacancies(): VacancyInfo[] {
        const domainSvc = DomainService.getInstance();
        const vacancies: VacancyInfo[] = [];

        for (const domain of domainSvc.getDomains()) {
            for (const unitId of domain.unitIds) {
                const unit = domainSvc.getUnit(unitId);
                if (!unit) continue;
                for (const roleId of unit.roleIds) {
                    const role = domainSvc.getRole(roleId);
                    if (!role) continue;
                    if (!role.memberId) {
                        vacancies.push({
                            roleId:     role.id,
                            roleTitle:  role.title,
                            kinPerMonth: role.kinPerMonth,
                            unitId:     unit.id,
                            unitName:   unit.name,
                            domainId:   domain.id,
                            domainName: domain.name,
                        });
                    }
                }
            }
        }

        return vacancies;
    }

    /** Returns filled roles whose termEndDate is within `days` days. */
    getExpiring(days = 60): ExpiringRoleInfo[] {
        const domainSvc = DomainService.getInstance();
        const cutoff = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
        const results: ExpiringRoleInfo[] = [];

        for (const domain of domainSvc.getDomains()) {
            for (const unitId of domain.unitIds) {
                const unit = domainSvc.getUnit(unitId);
                if (!unit) continue;
                for (const roleId of unit.roleIds) {
                    const role = domainSvc.getRole(roleId);
                    if (!role) continue;
                    if (role.memberId && role.termEndDate && role.termEndDate <= cutoff) {
                        results.push({
                            roleId:      role.id,
                            roleTitle:   role.title,
                            memberId:    role.memberId,
                            termEndDate: role.termEndDate.toISOString(),
                            unitId:      unit.id,
                            unitName:    unit.name,
                            domainId:    domain.id,
                            domainName:  domain.name,
                        });
                    }
                }
            }
        }

        return results.sort((a, b) => a.termEndDate.localeCompare(b.termEndDate));
    }

    // ── Mutations ──────────────────────────────────────────────────────────

    create(n: Nomination): void {
        this.nominations.set(n.id, n);
        this.loader?.save(n);
    }

    /** Nominee accepts the nomination (moves pending → accepted). */
    acceptByNominee(id: string, nomineeId: string): Nomination | null {
        const n = this.nominations.get(id);
        if (!n || n.status !== "pending") return null;
        if (n.nomineeId !== nomineeId) return null;
        n.status = "accepted";
        this.loader?.save(n);
        return n;
    }

    confirm(id: string, resolvedBy: string): Nomination | null {
        const n = this.nominations.get(id);
        if (!n || (n.status !== "pending" && n.status !== "accepted")) return null;
        n.status     = "confirmed";
        n.resolvedAt = new Date();
        n.resolvedBy = resolvedBy;
        this.loader?.save(n);
        return n;
    }

    decline(id: string, resolvedBy: string): Nomination | null {
        const n = this.nominations.get(id);
        if (!n || n.status !== "pending") return null;
        n.status     = "declined";
        n.resolvedAt = new Date();
        n.resolvedBy = resolvedBy;
        this.loader?.save(n);
        return n;
    }
}

export interface VacancyInfo {
    roleId:      string;
    roleTitle:   string;
    kinPerMonth: number;
    unitId:      string;
    unitName:    string;
    domainId:    string;
    domainName:  string;
}

export interface ExpiringRoleInfo {
    roleId:      string;
    roleTitle:   string;
    memberId:    string;
    termEndDate: string;
    unitId:      string;
    unitName:    string;
    domainId:    string;
    domainName:  string;
}
