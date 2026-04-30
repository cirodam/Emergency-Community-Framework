// Typed API wrappers for the community backend.
// All calls use relative URLs — Vite proxies /api → http://localhost:3002 in dev.

import { getToken, session } from "./session.js";

/**
 * Authenticated fetch — attaches the Bearer credential token when present.
 * On 401, clears the session so the app re-routes to login.
 */
async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
    const token = getToken();
    const headers = new Headers(init.headers);
    headers.set("Content-Type", "application/json");
    if (token) headers.set("Authorization", `Bearer ${token}`);
    const res = await fetch(input, { ...init, headers });
    if (res.status === 401) {
        session.logout();
    }
    return res;
}

export interface PersonDto {
    id: string;
    firstName: string;
    lastName: string;
    handle: string;
    phone: string | null;
    disabled: boolean;
    retired: boolean;
    steward: boolean;
    isSteward: boolean;
    joinDate: string;
    hasPassword: boolean;
    /** Present on individual GET /api/persons/:id; absent from list responses. */
    appPermissions?: Record<string, string[]>;
}

export interface AppSuspension {
    id: string;
    personId: string;
    app: string;
    reason: string;
    suspendedAt: string;
    suspendedBy: string;
}

export interface ConstitutionParam {
    value: number | boolean;
    authority: string;
    description: string;
    constraints?: { min?: number; max?: number };
}

export interface DocumentSection {
    id:             string;
    title?:         string;
    body:           string;
    paramKeys:      string[];
    amendAuthority: string;
}

export interface DocumentArticle {
    number:    string;
    title:     string;
    preamble?: string;
    sections:  DocumentSection[];
}

export interface ConstitutionDocument {
    version: number;
    adoptedAt: string;
    communityName: string;
    parameters: Record<string, ConstitutionParam>;
    amendments: {
        version: number;
        parameter: string;
        oldValue: number | boolean;
        newValue: number | boolean;
        proposalId: string;
        amendedAt: string;
    }[];
    authorityMap: {
        action: string;
        body: string;
        description: string;
    }[];
    articles: DocumentArticle[];
}

// ── Economics ─────────────────────────────────────────────────────────────────

export interface EconomicsDto {
    ready: boolean;
    centralBank: {
        kinInCirculation: number;
    } | null;
    socialInsurance: {
        poolBalance: number;
        totalContributed: number;
        totalPaidOut: number;
        memberCount: number;
    } | null;
    demographics: {
        total:          number;
        workingAge:     number;
        children:       number;
        retired:        number;
        disabled:       number;
        workingAgeMin:  number;
        retirementAge:  number;
    } | null;
    healthcareStaffing: {
        gp:           { recommended: number; ratioPerPerson: number };
        nurse:        { recommended: number; ratioPerPerson: number };
        dentist:      { recommended: number; ratioPerPerson: number };
        mentalHealth: { recommended: number; ratioPerPerson: number };
        paramedic:    { recommended: number; ratioPerPerson: number };
        midwife:      { recommended: number; ratioPerPerson: number };
    } | null;
}

export async function getEconomics(): Promise<EconomicsDto> {
    const res = await fetch("/api/economics");
    if (!res.ok) throw new Error("Failed to load economics data");
    return res.json() as Promise<EconomicsDto>;
}

// ── Federation membership ─────────────────────────────────────────────────────

export type FederationStatus = "none" | "pending" | "approved" | "rejected";

export interface FederationMembershipRecord {
    federationUrl:       string;
    applicationId:       string;
    memberId:            string | null;
    federationAccountId: string | null;
    communityHandle:     string;
    federationHandle:    string | null;
    commonwealthHandle:  string | null;
    globeHandle:         string | null;
    commonwealthUrl:     string | null;
    globeUrl:            string | null;
    status:              FederationStatus;
    appliedAt:           string;
}

export async function getFederationMembership(): Promise<FederationMembershipRecord | null> {
    const res = await fetch("/api/federation");
    if (!res.ok) throw new Error("Failed to load federation status");
    const data = await res.json() as { status: string } & Partial<FederationMembershipRecord>;
    if (data.status === "none") return null;
    return data as FederationMembershipRecord;
}

export async function syncFederationMembership(): Promise<FederationMembershipRecord | null> {
    const res = await apiFetch("/api/federation/sync");
    if (!res.ok) throw new Error("Failed to sync federation status");
    const data = await res.json() as { status: string } & Partial<FederationMembershipRecord>;
    if (data.status === "none") return null;
    return data as FederationMembershipRecord;
}

export async function applyToFederation(
    federationUrl: string,
    communityName: string,
    communityHandle: string,
): Promise<FederationMembershipRecord> {
    const res = await apiFetch("/api/federation/apply", {
        method: "POST",
        body: JSON.stringify({ federationUrl, communityName, communityHandle }),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Application failed");
    }
    return res.json() as Promise<FederationMembershipRecord>;
}

// ── Community Budget ───────────────────────────────────────────────────────────

export interface BudgetPayrollRow {
    roleId:      string;
    title:       string;
    memberId:    string | null;
    kinPerMonth: number;
}

export interface BudgetItem {
    id:        string;
    label:     string;
    amount:    number;
    category:  "supplies" | "equipment" | "services" | "other";
    note:      string;
    perMember?: boolean;
}

export interface BudgetDomainRow {
    domainId:   string;
    domainName: string;
    payroll:    BudgetPayrollRow[];
    items:      BudgetItem[];
    totals:     { payroll: number; items: number; total: number };
}

export interface CommunityBudgetDto {
    ready: boolean;
    inflow: {
        treasuryBalance:      number;
        duesRate:             number;
        estimatedMonthlyDues: number;
        kinInCirculation:     number;
    };
    outflow: {
        monthlyTotal: number;
        domains:      BudgetDomainRow[];
        totals:       { payroll: number; items: number; total: number };
    };
    memberCount:            number;
    foodAllowancePerMember: number;
    solvent: boolean;
}

export async function getCommunityBudget(): Promise<CommunityBudgetDto> {
    const res = await fetch("/api/budget");
    if (!res.ok) throw new Error("Failed to load budget");
    return res.json() as Promise<CommunityBudgetDto>;
}

// ── Setup ─────────────────────────────────────────────────────────────────────

export async function getSetupStatus(): Promise<{ needsSetup: boolean }> {
    const res = await fetch("/api/setup/status");
    if (!res.ok) throw new Error("Failed to check setup status");
    return res.json() as Promise<{ needsSetup: boolean }>;
}

export interface SetupPayload {
    communityName: string;
    firstName: string;
    lastName: string;
    birthDate: string;   // ISO date string, e.g. "1990-04-25"
    handle: string;
    password: string;
    phone?: string;
}

export interface SetupResult {
    communityName: string;
    founder: { id: string; firstName: string; lastName: string; handle: string };
}

export async function runSetup(payload: SetupPayload): Promise<SetupResult> {
    const res = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Setup failed");
    }
    return res.json() as Promise<SetupResult>;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function login(handle: string, password: string): Promise<PersonDto & { token: string }> {
    const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle, password }),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Login failed");
    }
    return res.json() as Promise<PersonDto & { token: string }>;
}

// ── Persons ───────────────────────────────────────────────────────────────────

export async function listPersons(): Promise<PersonDto[]> {
    const res = await apiFetch("/api/persons");
    if (!res.ok) throw new Error("Failed to load members");
    return res.json() as Promise<PersonDto[]>;
}

export async function getPerson(id: string): Promise<PersonDto> {
    const res = await apiFetch(`/api/persons/${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error("Member not found");
    return res.json() as Promise<PersonDto>;
}

export async function addPerson(data: {
    firstName: string;
    lastName: string;
    birthDate: string;
    bornInCommunity?: boolean;
    phone?: string | null;
}): Promise<PersonDto> {
    const res = await apiFetch("/api/persons", {
        method: "POST",
        body: JSON.stringify(data),
    });
    const body = await res.json().catch(() => ({})) as { error?: string } & PersonDto;
    if (!res.ok) throw new Error(body.error ?? "Failed to add person");
    return body as PersonDto;
}

// ── Settings ──────────────────────────────────────────────────────────────────

export async function setPassword(personId: string, password: string): Promise<void> {
    const res = await apiFetch(`/api/persons/${encodeURIComponent(personId)}/password`, {
        method: "POST",
        body: JSON.stringify({ password }),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Failed to set password");
    }
}

export async function setPin(personId: string, pin: string): Promise<void> {
    const res = await apiFetch(`/api/persons/${encodeURIComponent(personId)}/pin`, {
        method: "POST",
        body: JSON.stringify({ pin }),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Failed to set PIN");
    }
}

export async function updatePerson(personId: string, patch: { phone?: string }): Promise<PersonDto> {
    const res = await apiFetch(`/api/persons/${encodeURIComponent(personId)}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Failed to update profile");
    }
    return res.json() as Promise<PersonDto>;
}

export async function grantSteward(personId: string): Promise<PersonDto> {
    const res = await apiFetch(`/api/persons/${encodeURIComponent(personId)}/steward`, { method: "POST" });
    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Failed to grant stewardship");
    }
    return res.json() as Promise<PersonDto>;
}

export async function revokeSteward(personId: string): Promise<PersonDto> {
    const res = await apiFetch(`/api/persons/${encodeURIComponent(personId)}/steward`, { method: "DELETE" });
    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Failed to revoke stewardship");
    }
    return res.json() as Promise<PersonDto>;
}

export async function suspendFromApp(personId: string, app: string, reason: string): Promise<AppSuspension> {
    const res = await apiFetch(`/api/persons/${encodeURIComponent(personId)}/app-suspensions`, {
        method: "POST",
        body: JSON.stringify({ app, reason }),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Failed to suspend");
    }
    return res.json() as Promise<AppSuspension>;
}

export async function unsuspendFromApp(personId: string, app: string): Promise<void> {
    const res = await apiFetch(
        `/api/persons/${encodeURIComponent(personId)}/app-suspensions/${encodeURIComponent(app)}`,
        { method: "DELETE" },
    );
    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Failed to lift suspension");
    }
}

// ── Constitution ──────────────────────────────────────────────────────────────

export async function getConstitution(): Promise<ConstitutionDocument> {
    const res = await fetch("/api/constitution");
    if (!res.ok) throw new Error("Failed to load constitution");
    return res.json() as Promise<ConstitutionDocument>;
}

export async function updateConstitutionParameter(key: string, value: number | boolean): Promise<void> {
    const res = await apiFetch(`/api/constitution/parameters/${encodeURIComponent(key)}`, {
        method: "PATCH",
        body:   JSON.stringify({ value }),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Failed to update parameter");
    }
}

export async function updateConstitutionSection(sectionId: string, body: string): Promise<ConstitutionDocument> {
    const res = await apiFetch(`/api/constitution/sections/${encodeURIComponent(sectionId)}`, {
        method: "PATCH",
        body:   JSON.stringify({ body }),
    });
    if (!res.ok) {
        const b = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(b.error ?? "Failed to update section");
    }
    return res.json() as Promise<ConstitutionDocument>;
}

export interface SimulateStepResult {
    ok:             boolean;
    demurrageCount: number;
    duesCount:      number;
    foodCount:      number;
    payrollDomains: number;
}

export async function simulateBudgetStep(): Promise<SimulateStepResult> {
    const res = await apiFetch("/api/budget/simulate-step", { method: "POST" });
    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Simulation failed");
    }
    return res.json() as Promise<SimulateStepResult>;
}

// ── Associations ──────────────────────────────────────────────────────────────

export interface AssociationDto {
    id:           string;
    name:         string;
    handle:       string;
    description:  string;
    active:       boolean;
    memberIds:    string[];
    adminIds:     string[];
    memberCount:  number;
    registeredAt: string;
}

export async function listAssociations(): Promise<AssociationDto[]> {
    const res = await fetch("/api/associations");
    if (!res.ok) throw new Error("Failed to load associations");
    return res.json() as Promise<AssociationDto[]>;
}

export async function getAssociation(id: string): Promise<AssociationDto> {
    const res = await fetch(`/api/associations/${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error("Association not found");
    return res.json() as Promise<AssociationDto>;
}

export async function createAssociation(payload: { name: string; handle: string; description?: string }): Promise<AssociationDto> {
    const res = await apiFetch("/api/associations", {
        method: "POST",
        body: JSON.stringify(payload),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Failed to create association");
    }
    return res.json() as Promise<AssociationDto>;
}

export async function updateAssociation(id: string, patch: { name?: string; description?: string }): Promise<AssociationDto> {
    const res = await apiFetch(`/api/associations/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Failed to update association");
    }
    return res.json() as Promise<AssociationDto>;
}

export async function addAssociationMember(id: string, personId: string): Promise<AssociationDto> {
    const res = await apiFetch(`/api/associations/${encodeURIComponent(id)}/members`, {
        method: "POST",
        body: JSON.stringify({ personId }),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Failed to add member");
    }
    return res.json() as Promise<AssociationDto>;
}

export async function removeAssociationMember(id: string, personId: string): Promise<AssociationDto> {
    const res = await apiFetch(`/api/associations/${encodeURIComponent(id)}/members/${encodeURIComponent(personId)}`, {
        method: "DELETE",
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Failed to remove member");
    }
    return res.json() as Promise<AssociationDto>;
}

export async function addAssociationAdmin(id: string, personId: string): Promise<AssociationDto> {
    const res = await apiFetch(`/api/associations/${encodeURIComponent(id)}/admins`, {
        method: "POST",
        body: JSON.stringify({ personId }),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Failed to promote admin");
    }
    return res.json() as Promise<AssociationDto>;
}

export async function removeAssociationAdmin(id: string, personId: string): Promise<AssociationDto> {
    const res = await apiFetch(`/api/associations/${encodeURIComponent(id)}/admins/${encodeURIComponent(personId)}`, {
        method: "DELETE",
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Failed to remove admin");
    }
    return res.json() as Promise<AssociationDto>;
}

// ── Domains ───────────────────────────────────────────────────────────────────

export interface DomainDto {
    id: string;
    name: string;
    handle: string;
    description: string;
    unitIds: string[];
    roleIds: string[];
    poolId: string | null;
}

export interface UnitDto {
    id: string;
    name: string;
    description: string;
    type: string;
    personIds: string[];
    roleIds: string[];
    locationId: string | null;
    createdAt: string;
}

export async function listDomains(): Promise<DomainDto[]> {
    const res = await fetch("/api/domains");
    if (!res.ok) throw new Error("Failed to load domains");
    return res.json() as Promise<DomainDto[]>;
}

export async function getDomain(id: string): Promise<DomainDto> {
    const res = await fetch(`/api/domains/${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error("Domain not found");
    return res.json() as Promise<DomainDto>;
}

export async function updateDomain(id: string, patch: { poolId?: string | null }): Promise<DomainDto> {
    const res = await apiFetch(`/api/domains/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body:   JSON.stringify(patch),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Failed to update domain");
    }
    return res.json() as Promise<DomainDto>;
}

export interface DomainBudgetDto {
    payroll: BudgetPayrollRow[];
    items:   BudgetItem[];
    totals:  { payroll: number; items: number; total: number };
}

export async function getDomainBudget(id: string): Promise<DomainBudgetDto> {
    const res = await fetch(`/api/domains/${encodeURIComponent(id)}/budget`);
    if (!res.ok) throw new Error("Domain not found");
    return res.json() as Promise<DomainBudgetDto>;
}

export async function addBudgetItem(
    domainId: string,
    item: { label: string; amount: number; category?: string; note?: string },
): Promise<BudgetItem> {
    const res = await apiFetch(`/api/domains/${encodeURIComponent(domainId)}/budget/items`, {
        method: "POST",
        body:   JSON.stringify(item),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Failed to add budget item");
    }
    return res.json() as Promise<BudgetItem>;
}

export async function removeBudgetItem(domainId: string, itemId: string): Promise<void> {
    const res = await apiFetch(
        `/api/domains/${encodeURIComponent(domainId)}/budget/items/${encodeURIComponent(itemId)}`,
        { method: "DELETE" },
    );
    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Failed to remove budget item");
    }
}

export async function listUnits(): Promise<UnitDto[]> {
    const res = await fetch("/api/units");
    if (!res.ok) throw new Error("Failed to load units");
    return res.json() as Promise<UnitDto[]>;
}

export interface TemplateDto {
    type:        string;
    label:       string;
    description: string;
}

export async function listTemplates(): Promise<TemplateDto[]> {
    const res = await fetch("/api/templates");
    if (!res.ok) throw new Error("Failed to load templates");
    return res.json() as Promise<TemplateDto[]>;
}

export async function createUnit(type: string, domainId: string): Promise<UnitDto> {
    const res = await apiFetch("/api/units", {
        method: "POST",
        body:   JSON.stringify({ type, domainId }),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Failed to create unit");
    }
    return res.json() as Promise<UnitDto>;
}

export async function getUnit(id: string): Promise<UnitDto> {
    const res = await fetch(`/api/units/${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error("Unit not found");
    return res.json() as Promise<UnitDto>;
}

export async function updateUnit(id: string, patch: {
    name?: string;
    description?: string;
    locationId?: string | null;
}): Promise<UnitDto> {
    const res = await apiFetch(`/api/units/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body:   JSON.stringify(patch),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Failed to update unit");
    }
    return res.json() as Promise<UnitDto>;
}

// ── Roles ──────────────────────────────────────────────────────────────────────

export interface ScheduleSlot {
    /** 0 = Sunday, 1 = Monday … 6 = Saturday */
    dayOfWeek: number;
    /** "HH:MM" 24-hour */
    startTime: string;
    /** "HH:MM" 24-hour */
    endTime: string;
}

export interface RoleDto {
    id:             string;
    roleTypeId:     string | null;
    title:          string;
    description:    string;
    memberId:       string | null;
    kinPerMonth:    number;
    funded:         boolean;
    termStartDate:  string | null;
    termEndDate:    string | null;
    isActive:       boolean;
    weeklySchedule: ScheduleSlot[];
}

export interface RoleTypeDto {
    id:                 string;
    title:              string;
    description:        string;
    defaultKinPerMonth: number;
    preferredUnitTypes: string[];
}

export async function listRoles(): Promise<RoleDto[]> {
    const res = await fetch("/api/roles");
    if (!res.ok) throw new Error("Failed to load roles");
    return res.json() as Promise<RoleDto[]>;
}

export async function listRoleTypes(): Promise<RoleTypeDto[]> {
    const res = await fetch("/api/role-types");
    if (!res.ok) throw new Error("Failed to load role types");
    return res.json() as Promise<RoleTypeDto[]>;
}

export async function createRole(payload: {
    unitId: string;
    title?: string;
    description?: string;
    kinPerMonth?: number;
    roleTypeId?: string;
}): Promise<RoleDto> {
    const res = await apiFetch("/api/roles", {
        method: "POST",
        body:   JSON.stringify(payload),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Failed to create role");
    }
    return res.json() as Promise<RoleDto>;
}

export async function updateRole(id: string, patch: {
    title?: string;
    description?: string;
    kinPerMonth?: number;
    funded?: boolean;
    memberId?: string | null;
    weeklySchedule?: ScheduleSlot[];
}): Promise<RoleDto> {
    const res = await apiFetch(`/api/roles/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body:   JSON.stringify(patch),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Failed to update role");
    }
    return res.json() as Promise<RoleDto>;
}

export async function deleteRole(id: string): Promise<void> {
    const res = await apiFetch(`/api/roles/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Failed to delete role");
    }
}

// ── Pools ─────────────────────────────────────────────────────────────────────

export interface PoolDto {
    id: string;
    name: string;
    description: string;
    personIds: string[];
    createdAt: string;
}

export async function listPools(): Promise<PoolDto[]> {
    const res = await apiFetch("/api/pools");
    if (!res.ok) throw new Error("Failed to load pools");
    return res.json() as Promise<PoolDto[]>;
}

export async function getPool(id: string): Promise<PoolDto> {
    const res = await apiFetch(`/api/pools/${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error("Pool not found");
    return res.json() as Promise<PoolDto>;
}

export async function createPool(name: string, description = ""): Promise<PoolDto> {
    const res = await apiFetch("/api/pools", {
        method: "POST",
        body: JSON.stringify({ name, description }),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Failed to create pool");
    }
    return res.json() as Promise<PoolDto>;
}

export async function addPoolMember(poolId: string, personId: string): Promise<PoolDto> {
    const res = await apiFetch(`/api/pools/${encodeURIComponent(poolId)}/members`, {
        method: "POST",
        body: JSON.stringify({ personId }),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Failed to add pool member");
    }
    return res.json() as Promise<PoolDto>;
}

export async function removePoolMember(poolId: string, personId: string): Promise<PoolDto> {
    const res = await apiFetch(`/api/pools/${encodeURIComponent(poolId)}/members/${encodeURIComponent(personId)}`, {
        method: "DELETE",
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Failed to remove pool member");
    }
    return res.json() as Promise<PoolDto>;
}

export async function deletePool(poolId: string): Promise<void> {
    const res = await apiFetch(`/api/pools/${encodeURIComponent(poolId)}`, { method: "DELETE" });
    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Failed to delete pool");
    }
}

// ── Member applications ───────────────────────────────────────────────────────

export interface ApplicationVoucher {
    id: string;
    name: string;
}

export interface ApplicationDto {
    id: string;
    firstName: string;
    lastName: string;
    birthDate: string;
    message: string;
    status: "pending" | "admitted" | "withdrawn";
    voucherIds: string[];
    vouchers: ApplicationVoucher[];
    vouchesRequired: number;
    submittedBy: string;
    submittedByName: string;
    submittedAt: string;
    admittedAt: string | null;
}

export async function listApplications(): Promise<ApplicationDto[]> {
    const res = await apiFetch("/api/applications");
    if (!res.ok) throw new Error("Failed to load applications");
    return res.json() as Promise<ApplicationDto[]>;
}

export async function submitApplication(payload: {
    firstName: string;
    lastName: string;
    birthDate: string;
    message: string;
}): Promise<ApplicationDto> {
    const res = await apiFetch("/api/applications", {
        method: "POST",
        body: JSON.stringify(payload),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Failed to submit application");
    }
    return res.json() as Promise<ApplicationDto>;
}

// Public (no auth required) — applicant submits their own application.
export async function submitPublicApplication(payload: {
    firstName: string;
    lastName: string;
    birthDate: string;
    message: string;
}): Promise<ApplicationDto> {
    const res = await apiFetch("/api/apply", {
        method: "POST",
        body: JSON.stringify(payload),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Failed to submit application");
    }
    return res.json() as Promise<ApplicationDto>;
}

export async function vouchForApplication(applicationId: string): Promise<ApplicationDto> {
    const res = await apiFetch(`/api/applications/${encodeURIComponent(applicationId)}/vouch`, {
        method: "POST",
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Failed to vouch");
    }
    return res.json() as Promise<ApplicationDto>;
}

export async function removeApplicationVouch(applicationId: string): Promise<ApplicationDto> {
    const res = await apiFetch(`/api/applications/${encodeURIComponent(applicationId)}/vouch`, {
        method: "DELETE",
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Failed to remove vouch");
    }
    return res.json() as Promise<ApplicationDto>;
}

export async function withdrawApplication(applicationId: string): Promise<ApplicationDto> {
    const res = await apiFetch(`/api/applications/${encodeURIComponent(applicationId)}/withdraw`, {
        method: "POST",
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Failed to withdraw application");
    }
    return res.json() as Promise<ApplicationDto>;
}

// ── Locations ─────────────────────────────────────────────────────────────────

export interface LocationDto {
    id:          string;
    name:        string;
    address:     string;
    lat:         number | null;
    lng:         number | null;
    description: string;
    createdAt:   string;
}

export async function listLocations(): Promise<LocationDto[]> {
    const res = await fetch("/api/locations");
    if (!res.ok) throw new Error("Failed to load locations");
    return res.json() as Promise<LocationDto[]>;
}

export async function getLocation(id: string): Promise<LocationDto> {
    const res = await fetch(`/api/locations/${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error("Location not found");
    return res.json() as Promise<LocationDto>;
}

export async function createLocation(data: {
    name: string;
    address: string;
    lat?: number | null;
    lng?: number | null;
    description?: string;
}): Promise<LocationDto> {
    const res = await apiFetch("/api/locations", {
        method: "POST",
        body:   JSON.stringify(data),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Failed to create location");
    }
    return res.json() as Promise<LocationDto>;
}

export async function updateLocation(id: string, patch: {
    name?: string;
    address?: string;
    lat?: number | null;
    lng?: number | null;
    description?: string;
}): Promise<LocationDto> {
    const res = await apiFetch(`/api/locations/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body:   JSON.stringify(patch),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Failed to update location");
    }
    return res.json() as Promise<LocationDto>;
}

export async function deleteLocation(id: string): Promise<void> {
    const res = await apiFetch(`/api/locations/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Failed to delete location");
    }
}

// ── Governance Proposals ───────────────────────────────────────────────────────

export type ProposalType =
    | "add-member"
    | "suspend-member"
    | "reinstate-member"
    | "change-role"
    | "budget-change"
    | "pool-change"
    | "constitution-amendment"
    | "other";

export const PROPOSAL_TYPE_LABELS: Record<ProposalType, string> = {
    "add-member":             "Add Member",
    "suspend-member":         "Suspend Member",
    "reinstate-member":       "Reinstate Member",
    "change-role":            "Change Role",
    "budget-change":          "Budget Change",
    "pool-change":            "Pool Change",
    "constitution-amendment": "Constitution Amendment",
    "other":                  "Other",
};

export const PROPOSAL_TYPES = Object.keys(PROPOSAL_TYPE_LABELS) as ProposalType[];

export type ProposalStatus = "open" | "passed" | "rejected" | "expired" | "withdrawn";

export interface ProposalVoteDto {
    personId:  string;
    handle:    string;
    vote:      "approve" | "reject" | "abstain";
    votedAt:   string;
    comment:   string;
}

export interface ProposalDto {
    id:              string;
    type:            ProposalType;
    poolId:          string;
    proposerId:      string;
    proposerHandle:  string;
    title:           string;
    description:     string;
    payload:         Record<string, unknown>;
    approvalsNeeded: number;
    status:          ProposalStatus;
    votes:           ProposalVoteDto[];
    approvalCount:   number;
    rejectionCount:  number;
    createdAt:       string;
    expiresAt:       string;
    executedAt:      string | null;
    outcomeNote:     string;
}

export async function listProposals(opts: { status?: string; poolId?: string } = {}): Promise<ProposalDto[]> {
    const params = new URLSearchParams();
    if (opts.status) params.set("status", opts.status);
    if (opts.poolId) params.set("poolId", opts.poolId);
    const qs = params.toString() ? `?${params.toString()}` : "";
    const res = await apiFetch(`/api/proposals${qs}`);
    if (!res.ok) throw new Error("Failed to load proposals");
    return res.json() as Promise<ProposalDto[]>;
}

export async function getProposal(id: string): Promise<ProposalDto> {
    const res = await apiFetch(`/api/proposals/${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error("Proposal not found");
    return res.json() as Promise<ProposalDto>;
}

export async function createProposal(data: {
    type:            ProposalType;
    poolId:          string;
    title:           string;
    description:     string;
    payload?:        Record<string, unknown>;
    approvalsNeeded: number;
    ttlDays?:        number;
}): Promise<ProposalDto> {
    const res = await apiFetch("/api/proposals", {
        method: "POST",
        body:   JSON.stringify(data),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Failed to create proposal");
    }
    return res.json() as Promise<ProposalDto>;
}

export async function voteOnProposal(
    id:      string,
    vote:    "approve" | "reject" | "abstain",
    comment: string = "",
): Promise<ProposalDto> {
    const res = await apiFetch(`/api/proposals/${encodeURIComponent(id)}/vote`, {
        method: "POST",
        body:   JSON.stringify({ vote, comment }),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Failed to cast vote");
    }
    return res.json() as Promise<ProposalDto>;
}

export async function withdrawProposal(id: string): Promise<ProposalDto> {
    const res = await apiFetch(`/api/proposals/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Failed to withdraw proposal");
    }
    return res.json() as Promise<ProposalDto>;
}

// ── Network / Nodes ───────────────────────────────────────────────────────────

export type NodeType = "community" | "infrastructure" | "federation" | "forum";

export interface NodeIdentityDto {
    id: string;
    type: NodeType;
    name: string;
    address: string;
    publicKey: string;
    createdAt: string;
}

export interface PeerRecordDto {
    id: string;
    type: NodeType;
    name: string;
    address: string;
    publicKey: string;
    firstSeenAt: string;
    lastSeenAt: string;
    lastLatencyMs: number | null;
    consecutiveFailures: number;
    healthy: boolean;
}

export async function getNodeIdentity(): Promise<NodeIdentityDto> {
    const res = await apiFetch("/api/node/identity");
    if (!res.ok) throw new Error("Failed to load node identity");
    return res.json() as Promise<NodeIdentityDto>;
}

export async function getNodePeers(): Promise<PeerRecordDto[]> {
    const res = await apiFetch("/api/node/peers");
    if (!res.ok) throw new Error("Failed to load peers");
    return res.json() as Promise<PeerRecordDto[]>;
}

// ── Nominations & Vacancies ───────────────────────────────────────────────────

export type NominationStatus = "pending" | "confirmed" | "declined";

export interface NominationDto {
    id:         string;
    createdAt:  string;
    createdBy:  string;
    type:       "role" | "pool";
    roleId:     string;
    unitId:     string;
    domainId:   string;
    poolId:     string | null;
    poolName:   string | null;
    nomineeId:  string;
    statement:  string;
    status:     NominationStatus;
    resolvedAt: string | null;
    resolvedBy: string | null;
}

export interface VacancyDto {
    roleId:      string;
    roleTitle:   string;
    kinPerMonth: number;
    unitId:      string;
    unitName:    string;
    domainId:    string;
    domainName:  string;
}

export interface ExpiringRoleDto {
    roleId:      string;
    roleTitle:   string;
    memberId:    string;
    termEndDate: string;
    unitId:      string;
    unitName:    string;
    domainId:    string;
    domainName:  string;
}

export async function listVacancies(): Promise<VacancyDto[]> {
    const res = await fetch("/api/nominations/vacancies");
    if (!res.ok) throw new Error("Failed to load vacancies");
    return res.json() as Promise<VacancyDto[]>;
}

export async function listNominations(): Promise<NominationDto[]> {
    const res = await apiFetch("/api/nominations");
    if (!res.ok) throw new Error("Failed to load nominations");
    return res.json() as Promise<NominationDto[]>;
}

export async function createNomination(data: {
    roleId:    string;
    nomineeId: string;
    statement: string;
}): Promise<NominationDto> {
    const res = await apiFetch("/api/nominations", {
        method: "POST",
        body:   JSON.stringify(data),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Failed to submit nomination");
    }
    return res.json() as Promise<NominationDto>;
}

export async function createPoolNomination(data: {
    poolId:    string;
    nomineeId: string;
    statement: string;
}): Promise<NominationDto> {
    const res = await apiFetch("/api/nominations/pool", {
        method: "POST",
        body:   JSON.stringify(data),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Failed to submit nomination");
    }
    return res.json() as Promise<NominationDto>;
}

export async function confirmNomination(id: string): Promise<NominationDto> {
    const res = await apiFetch(`/api/nominations/${encodeURIComponent(id)}/confirm`, { method: "PATCH" });
    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Failed to confirm nomination");
    }
    return res.json() as Promise<NominationDto>;
}

export async function declineNomination(id: string): Promise<NominationDto> {
    const res = await apiFetch(`/api/nominations/${encodeURIComponent(id)}/decline`, { method: "PATCH" });
    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Failed to decline nomination");
    }
    return res.json() as Promise<NominationDto>;
}

export async function listExpiringRoles(days = 60): Promise<ExpiringRoleDto[]> {
    const res = await apiFetch(`/api/nominations/expiring?days=${days}`);
    if (!res.ok) throw new Error("Failed to load expiring roles");
    return res.json() as Promise<ExpiringRoleDto[]>;
}

// ── Motions ───────────────────────────────────────────────────────────────────

export type MotionStage   = "draft" | "deliberating" | "voting" | "resolved" | "proposed" | "discussed" | "voted";
export type MotionOutcome = "passed" | "failed" | "withdrawn" | "referred";
export type VoteThresholdKey = "thresholdSimpleMajority" | "thresholdSupermajority" | "thresholdNearConsensus";

export interface MotionComment {
    id:           string;
    authorId:     string;
    authorHandle: string;
    body:         string;
    createdAt:    string;
}

export interface MotionVote {
    personId:  string;
    handle:    string;
    vote:      "approve" | "reject" | "abstain";
    votedAt:   string;
}

export interface MotionDto {
    id:                   string;
    body:                 string;
    stage:                MotionStage;
    title:                string;
    description:          string;
    proposerId:           string;
    proposerHandle:       string;
    createdAt:            string;
    deliberationStartedAt: string | null;
    votingOpensAt:        string | null;
    votingClosesAt:       string | null;
    thresholdKey:         VoteThresholdKey | null;
    votes:                MotionVote[];
    comments:             MotionComment[];
    outcome:              MotionOutcome | null;
    outcomeNote:          string;
    resolvedAt:           string | null;
    referredToId:         string | null;
    parentId:             string | null;
    pendingAmendmentIds:  string[];
    approvalCount:        number;
    rejectionCount:       number;
}

export async function listMotions(opts: { body?: string; stage?: string } = {}): Promise<MotionDto[]> {
    const params = new URLSearchParams();
    if (opts.body)  params.set("body",  opts.body);
    if (opts.stage) params.set("stage", opts.stage);
    const qs = params.toString();
    const res = await apiFetch(`/api/motions${qs ? `?${qs}` : ""}`);
    if (!res.ok) throw new Error("Failed to load motions");
    return res.json() as Promise<MotionDto[]>;
}

export async function getMotion(id: string): Promise<MotionDto> {
    const res = await apiFetch(`/api/motions/${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error("Motion not found");
    return res.json() as Promise<MotionDto>;
}

export async function createMotion(data: {
    body:        string;
    title:       string;
    description: string;
    parentId?:   string;
}): Promise<MotionDto> {
    const res = await apiFetch("/api/motions", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(data),
    });
    if (!res.ok) {
        const b = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(b.error ?? "Failed to create motion");
    }
    return res.json() as Promise<MotionDto>;
}

export async function submitMotionForDeliberation(id: string, thresholdKey?: VoteThresholdKey): Promise<MotionDto> {
    const res = await apiFetch(`/api/motions/${encodeURIComponent(id)}/deliberate`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ thresholdKey }),
    });
    if (!res.ok) {
        const b = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(b.error ?? "Failed to submit motion");
    }
    return res.json() as Promise<MotionDto>;
}

export async function openMotionVoting(id: string): Promise<MotionDto> {
    const res = await apiFetch(`/api/motions/${encodeURIComponent(id)}/open-voting`, { method: "POST" });
    if (!res.ok) {
        const b = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(b.error ?? "Failed to open voting");
    }
    return res.json() as Promise<MotionDto>;
}

export async function castMotionVote(id: string, vote: "approve" | "reject" | "abstain"): Promise<MotionDto> {
    const res = await apiFetch(`/api/motions/${encodeURIComponent(id)}/vote`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ vote }),
    });
    if (!res.ok) {
        const b = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(b.error ?? "Failed to cast vote");
    }
    return res.json() as Promise<MotionDto>;
}

export async function addMotionComment(id: string, body: string): Promise<MotionDto> {
    const res = await apiFetch(`/api/motions/${encodeURIComponent(id)}/comment`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ body }),
    });
    if (!res.ok) {
        const b = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(b.error ?? "Failed to add comment");
    }
    return res.json() as Promise<MotionDto>;
}

export async function markMotionDiscussed(id: string): Promise<MotionDto> {
    const res = await apiFetch(`/api/motions/${encodeURIComponent(id)}/discuss`, { method: "POST" });
    if (!res.ok) {
        const b = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(b.error ?? "Failed to mark discussed");
    }
    return res.json() as Promise<MotionDto>;
}

export async function recordMotionOutcome(id: string, outcome: MotionOutcome, outcomeNote = ""): Promise<MotionDto> {
    const res = await apiFetch(`/api/motions/${encodeURIComponent(id)}/outcome`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ outcome, outcomeNote }),
    });
    if (!res.ok) {
        const b = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(b.error ?? "Failed to record outcome");
    }
    return res.json() as Promise<MotionDto>;
}

export async function withdrawMotion(id: string): Promise<MotionDto> {
    const res = await apiFetch(`/api/motions/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!res.ok) {
        const b = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(b.error ?? "Failed to withdraw motion");
    }
    return res.json() as Promise<MotionDto>;
}

// ── Shifts ────────────────────────────────────────────────────────────────────

export interface ShiftDto {
    id:               string;
    domainId:         string;
    label:            string;
    startAt:          string;
    endAt:            string;
    assignedPersonId: string | null;
    note:             string | null;
    createdBy:        string;
    createdAt:        string;
    isOpen:           boolean;
}

export async function listShifts(opts: {
    domainId?: string;
    personId?: string;
    open?: boolean;
    from?: string;
    to?: string;
} = {}): Promise<ShiftDto[]> {
    const params = new URLSearchParams();
    if (opts.domainId) params.set("domainId", opts.domainId);
    if (opts.personId) params.set("personId", opts.personId);
    if (opts.open)     params.set("open", "true");
    if (opts.from)     params.set("from", opts.from);
    if (opts.to)       params.set("to", opts.to);
    const qs = params.toString() ? `?${params.toString()}` : "";
    const res = await apiFetch(`/api/shifts${qs}`);
    if (!res.ok) throw new Error("Failed to load shifts");
    return res.json() as Promise<ShiftDto[]>;
}

export async function createShift(data: {
    domainId: string;
    label:    string;
    startAt:  string;
    endAt:    string;
    note?:    string | null;
}): Promise<ShiftDto> {
    const res = await apiFetch("/api/shifts", {
        method: "POST",
        body:   JSON.stringify(data),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Failed to create shift");
    }
    return res.json() as Promise<ShiftDto>;
}

export async function claimShift(id: string): Promise<ShiftDto> {
    const res = await apiFetch(`/api/shifts/${encodeURIComponent(id)}/claim`, { method: "POST" });
    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Failed to claim shift");
    }
    return res.json() as Promise<ShiftDto>;
}

export async function unclaimShift(id: string): Promise<ShiftDto> {
    const res = await apiFetch(`/api/shifts/${encodeURIComponent(id)}/unclaim`, { method: "POST" });
    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Failed to unclaim shift");
    }
    return res.json() as Promise<ShiftDto>;
}

export async function deleteShift(id: string): Promise<void> {
    const res = await apiFetch(`/api/shifts/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Failed to delete shift");
    }
}
