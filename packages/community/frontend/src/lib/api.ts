// Typed API wrappers for the community backend.
// All calls use relative URLs — Vite proxies /api → http://localhost:3002 in dev.

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

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function login(handle: string, password: string): Promise<PersonDto> {
    const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle, password }),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Login failed");
    }
    return res.json() as Promise<PersonDto>;
}

// ── Persons ───────────────────────────────────────────────────────────────────

export async function listPersons(): Promise<PersonDto[]> {
    const res = await fetch("/api/persons");
    if (!res.ok) throw new Error("Failed to load members");
    return res.json() as Promise<PersonDto[]>;
}

export async function getPerson(id: string): Promise<PersonDto> {
    const res = await fetch(`/api/persons/${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error("Member not found");
    return res.json() as Promise<PersonDto>;
}

// ── Settings ──────────────────────────────────────────────────────────────────

export async function setPassword(personId: string, password: string): Promise<void> {
    const res = await fetch(`/api/persons/${encodeURIComponent(personId)}/password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
