import { getToken } from "./session.js";

function authHeaders(): Record<string, string> {
    const token = getToken();
    return token ? { "Authorization": `Bearer ${token}` } : {};
}

async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
    const res = await fetch(input, {
        ...init,
        headers: { ...authHeaders(), ...(init.headers ?? {}) },
    });
    return res;
}

// ── Config ────────────────────────────────────────────────────────────────────

export interface FederationConfig {
    communityUrl:        string;
    federationUrl:       string;
    isConfigured:        boolean;
    /** True when COMMUNITY_URL env var is set — backend will use it without needing a URL from the form. */
    communityUrlPreset:  boolean;
}

export async function getConfig(): Promise<FederationConfig> {
    const res = await fetch("/api/config");
    if (!res.ok) throw new Error("Could not load federation config");
    return res.json() as Promise<FederationConfig>;
}

export async function setupFederation(communityUrl?: string): Promise<{ name: string; handle: string; url: string }> {
    const res = await fetch("/api/setup", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(communityUrl ? { communityUrl } : {}),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Setup failed");
    }
    const data = await res.json() as { member: { name: string; handle: string; url: string } };
    return data.member;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface VerifiedSession {
    personId:          string;
    handle:            string;
    communityMemberId: string;
    communityHandle: string;
    communityName:   string;
    expiresAt:       string;
}

export async function verifyToken(token: string): Promise<VerifiedSession> {
    const res = await fetch("/api/auth/verify", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ token }),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Authentication failed");
    }
    return res.json() as Promise<VerifiedSession>;
}

// ── Members ───────────────────────────────────────────────────────────────────

export interface MemberDto {
    id:              string;
    name:            string;
    handle:          string;
    communityNodeId: string;
    communityPublicKey: string;
    url:             string;
    joinedAt:        string;
    bankAccountId:   string | null;
    isFounder:       boolean;
}

export async function listMembers(): Promise<MemberDto[]> {
    const res = await apiFetch("/api/members");
    if (!res.ok) throw new Error("Failed to load members");
    return res.json() as Promise<MemberDto[]>;
}

// ── Economics ─────────────────────────────────────────────────────────────────

export interface EconomicsDto {
    kitheInCirculation: number;
    memberCount:        number;
    members:            { name: string; handle: string; balance: number }[];
}

export async function getEconomics(): Promise<EconomicsDto> {
    const res = await apiFetch("/api/economics");
    if (!res.ok) throw new Error("Failed to load economics");
    return res.json() as Promise<EconomicsDto>;
}

// ── Applications ──────────────────────────────────────────────────────────────

export type ApplicationStatus = "pending" | "approved" | "rejected";

export interface ApplicationDto {
    id:                string;
    communityName:     string;
    communityHandle:   string;
    communityNodeId:   string;
    communityUrl:      string;
    communityPriority: number;
    memberCount:       number;
    status:            ApplicationStatus;
    submittedAt:       string;
    reviewedAt:        string | null;
}

export async function listApplications(): Promise<ApplicationDto[]> {
    const res = await apiFetch("/api/applications");
    if (!res.ok) throw new Error("Failed to load applications");
    return res.json() as Promise<ApplicationDto[]>;
}

export async function reviewApplication(id: string, status: "approved" | "rejected"): Promise<ApplicationDto> {
    const res = await apiFetch(`/api/applications/${encodeURIComponent(id)}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ status }),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Review failed");
    }
    return res.json() as Promise<ApplicationDto>;
}

// ── Assembly ──────────────────────────────────────────────────────────────────

export interface AssemblySeat {
    communityMemberId: string;
    communityHandle:   string;
    personHandle:      string | null;
    personName:        string | null;
    seatedAt:          string | null;
}

export interface AssemblyTerm {
    id:          string;
    termNumber:  number;
    startedAt:   string;
    endsAt:      string | null;
    seats:       AssemblySeat[];
    motionIds:   string[];
}

export async function getAssembly(): Promise<{ term: AssemblyTerm | null }> {
    const res = await apiFetch("/api/assembly");
    if (!res.ok) throw new Error("Failed to load assembly");
    return res.json() as Promise<{ term: AssemblyTerm | null }>;
}

export async function startAssemblyTerm(): Promise<AssemblyTerm> {
    const res = await apiFetch("/api/assembly/terms", { method: "POST" });
    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Failed to start term");
    }
    const data = await res.json() as { term: AssemblyTerm };
    return data.term;
}

export async function seatDelegate(opts: {
    communityMemberId: string;
    communityHandle:   string;
    personHandle:      string;
    personName:        string;
}): Promise<AssemblyTerm> {
    const res = await apiFetch("/api/assembly/delegates", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(opts),
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Failed to seat delegate");
    }
    const data = await res.json() as { term: AssemblyTerm };
    return data.term;
}

export async function vacateSeat(communityMemberId: string): Promise<AssemblyTerm> {
    const res = await apiFetch(`/api/assembly/delegates/${encodeURIComponent(communityMemberId)}`, {
        method: "DELETE",
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Failed to vacate seat");
    }
    const data = await res.json() as { term: AssemblyTerm };
    return data.term;
}

// ── Motions ───────────────────────────────────────────────────────────────────

export type MotionStage = "draft" | "proposed" | "deliberation" | "voting" | "resolved" | "withdrawn";
export type MotionOutcome = "passed" | "failed" | "withdrawn";

export interface MotionVote {
    communityMemberId: string;
    communityHandle:   string;
    vote:              "approve" | "reject" | "abstain";
    votedAt:           string;
}

export interface MotionComment {
    id:            string;
    communityHandle: string;
    authorHandle:  string;
    body:          string;
    createdAt:     string;
}

export interface FederationMotionDto {
    id:                    string;
    body:                  string;
    stage:                 MotionStage;
    title:                 string;
    description:           string;
    proposerMemberId:      string;
    proposerHandle:        string;
    createdAt:             string;
    deliberationStartedAt: string | null;
    votingOpensAt:         string | null;
    votingClosesAt:        string | null;
    thresholdKey:          string | null;
    votes:                 MotionVote[];
    comments:              MotionComment[];
    outcome:               MotionOutcome | null;
    outcomeNote:           string;
    resolvedAt:            string | null;
    approvalCount:         number;
    rejectionCount:        number;
}

export async function listFederationMotions(): Promise<FederationMotionDto[]> {
    const res = await apiFetch("/api/motions");
    if (!res.ok) throw new Error("Failed to load motions");
    return res.json() as Promise<FederationMotionDto[]>;
}

export async function createFederationMotion(opts: {
    body:             string;
    title:            string;
    description:      string;
    proposerMemberId: string;
    proposerHandle:   string;
}): Promise<FederationMotionDto> {
    const res = await apiFetch("/api/motions", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(opts),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? "Failed to create motion");
    }
    return res.json() as Promise<FederationMotionDto>;
}

export async function advanceFederationMotion(
    id: string,
    opts: {
        action: "submit" | "open-voting" | "record-outcome" | "discussed" | "withdraw";
        thresholdKey?: string;
        communityMemberId?: string;
        communityHandle?: string;
        outcome?: string;
        outcomeNote?: string;
    },
): Promise<FederationMotionDto> {
    const res = await apiFetch(`/api/motions/${encodeURIComponent(id)}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(opts),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? "Failed to advance motion");
    }
    return res.json() as Promise<FederationMotionDto>;
}

export async function castFederationVote(
    id: string,
    communityMemberId: string,
    communityHandle: string,
    vote: "approve" | "reject" | "abstain",
): Promise<FederationMotionDto> {
    const res = await apiFetch(`/api/motions/${encodeURIComponent(id)}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action: "vote", communityMemberId, communityHandle, vote }),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? "Failed to cast vote");
    }
    return res.json() as Promise<FederationMotionDto>;
}

// ── Health Insurance ──────────────────────────────────────────────────────────

export type InsuranceClaimStatus = "pending" | "auto-approved" | "approved" | "rejected" | "needs-review";

export interface InsuranceClaimDto {
    id:                string;
    communityMemberId: string;
    communityHandle:   string;
    patientName:       string;
    reason:            string;
    requestedKin:      number;
    approvedKin:       number | null;
    status:            InsuranceClaimStatus;
    transferId:        string | null;
    submittedAt:       string;
    reviewedAt:        string | null;
    reviewNote:        string;
}

export async function listInsuranceClaims(): Promise<{ claims: InsuranceClaimDto[]; poolBalance: number }> {
    const res = await apiFetch("/api/insurance/claims");
    if (!res.ok) throw new Error("Failed to load insurance claims");
    return res.json() as Promise<{ claims: InsuranceClaimDto[]; poolBalance: number }>;
}

export async function submitInsuranceClaim(opts: {
    communityMemberId: string;
    communityHandle:   string;
    patientName:       string;
    reason:            string;
    requestedKin:      number;
}): Promise<InsuranceClaimDto> {
    const res = await apiFetch("/api/insurance/claims", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(opts),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? "Failed to submit claim");
    }
    return res.json() as Promise<InsuranceClaimDto>;
}

export async function reviewInsuranceClaim(
    id: string,
    status: "approved" | "rejected",
    approvedKin?: number,
    reviewNote?: string,
): Promise<InsuranceClaimDto> {
    const res = await apiFetch(`/api/insurance/claims/${encodeURIComponent(id)}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ status, approvedKin, reviewNote }),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? "Failed to review claim");
    }
    return res.json() as Promise<InsuranceClaimDto>;
}

// ── Clearing ──────────────────────────────────────────────────────────────────

export interface CommunityBalanceEntry {
    memberId:      string;
    name:          string;
    handle:        string;
    url:           string;
    bankAccountId: string | null;
    balance:       number | null;
    creditLineKin: number;
    isFounder:     boolean;
}

export interface ClearingBalancesDto {
    communities: CommunityBalanceEntry[];
    clearingHouse: {
        structuralAidBalance:  number | null;
        solidarityPoolBalance: number | null;
    };
}

export async function getClearingBalances(): Promise<ClearingBalancesDto> {
    const res = await apiFetch("/api/clearing/balances");
    if (!res.ok) throw new Error("Could not load clearing balances");
    return res.json() as Promise<ClearingBalancesDto>;
}
