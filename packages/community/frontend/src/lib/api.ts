// Typed API wrappers for the community backend.
// All calls use relative URLs — Vite proxies /api → http://localhost:3002 in dev.

import { getToken } from "./session.js";

/**
 * Authenticated fetch — attaches the Bearer credential token when present.
 * Use for all calls that require a logged-in user.
 */
function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
    const token = getToken();
    const headers = new Headers(init.headers);
    headers.set("Content-Type", "application/json");
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return fetch(input, { ...init, headers });
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
        issuanceAccountId: string;
    } | null;
    currencyBoard: {
        kitheInCirculation: number;
        issuanceAccountId: string;
    } | null;
    socialInsurance: {
        poolBalance: number;
        totalContributed: number;
        totalPaidOut: number;
        memberCount: number;
        poolAccountId: string;
    } | null;
}

export async function getEconomics(): Promise<EconomicsDto> {
    const res = await fetch("/api/economics");
    if (!res.ok) throw new Error("Failed to load economics data");
    return res.json() as Promise<EconomicsDto>;
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

export async function listUnits(): Promise<UnitDto[]> {
    const res = await fetch("/api/units");
    if (!res.ok) throw new Error("Failed to load units");
    return res.json() as Promise<UnitDto[]>;
}
