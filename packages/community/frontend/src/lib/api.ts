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
    joinDate: string;
    hasPassword: boolean;
}

export interface ConstitutionDocument {
    version: number;
    adoptedAt: string;
    communityName: string;
    parameters: Record<string, {
        value: number | boolean;
        authority: string;
        description: string;
        constraints?: { min?: number; max?: number };
    }>;
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
}

// ── Economics ─────────────────────────────────────────────────────────────────

export interface EconomicsDto {
    ready: boolean;
    centralBank: {
        kinInCirculation: number;
    } | null;
    currencyBoard: {
        kitheInCirculation: number;
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
}

export async function getEconomics(): Promise<EconomicsDto> {
    const res = await fetch("/api/economics");
    if (!res.ok) throw new Error("Failed to load economics data");
    return res.json() as Promise<EconomicsDto>;
}

// ── Community Budget ───────────────────────────────────────────────────────────

export interface BudgetPayrollRow {
    roleId:      string;
    title:       string;
    memberId:    string | null;
    kinPerMonth: number;
}

export interface BudgetItem {
    id:       string;
    label:    string;
    amount:   number;
    category: "supplies" | "equipment" | "services" | "other";
    note:     string;
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

// ── Constitution ──────────────────────────────────────────────────────────────

export async function getConstitution(): Promise<ConstitutionDocument> {
    const res = await fetch("/api/constitution");
    if (!res.ok) throw new Error("Failed to load constitution");
    return res.json() as Promise<ConstitutionDocument>;
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
