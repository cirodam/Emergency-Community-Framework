import { getToken, session } from "./session.js";

async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
    const token = getToken();
    const headers = new Headers(init.headers);
    headers.set("Content-Type", "application/json");
    if (token) headers.set("Authorization", `Bearer ${token}`);
    const res = await fetch(input, { ...init, headers });
    if (res.status === 401) session.logout();
    return res;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type SessionCategory =
    | "practical-skills" | "health-wellness" | "arts-culture"
    | "civic-governance" | "languages" | "trades" | "agriculture" | "other";

export type SessionStatus =
    | "draft" | "pending-approval" | "approved" | "cancelled" | "completed";

export type CourseStatus = "draft" | "active" | "completed" | "cancelled";

export type ClassRequestStatus = "open" | "claimed" | "fulfilled";

export interface InstructorSplit { personId: string; handle: string; pct: number; }

export interface AttendanceRecord { memberId: string; attended: boolean; recordedAt: string; }

export interface LyceumSession {
    id:                string;
    courseId:          string | null;
    title:             string;
    description:       string;
    category:          SessionCategory;
    instructorIds:     string[];
    instructorSplits:  InstructorSplit[];
    scheduledAt:       string;
    durationMinutes:   number;
    location:          string;
    capacity:          number | null;
    instructorRateKin: number;
    studentStipendKin: number;
    status:            SessionStatus;
    approvalMotionId:  string | null;
    enrollmentIds:     string[];
    attendanceLog:     AttendanceRecord[];
    createdAt:         string;
    updatedAt:         string;
}

export interface Course {
    id:               string;
    title:            string;
    description:      string;
    category:         SessionCategory;
    instructorIds:    string[];
    prerequisites:    string;
    classIds:         string[];
    status:           CourseStatus;
    approvalMotionId: string | null;
    budgetReservedKin: number;
    createdAt:        string;
    updatedAt:        string;
}

export interface ClassRequest {
    id:              string;
    requesterId:     string;
    requesterHandle: string;
    title:           string;
    description:     string;
    upvoteIds:       string[];
    status:          ClassRequestStatus;
    claimedBy:       string | null;
    sessionId:       string | null;
    createdAt:       string;
}

// ── Sessions ──────────────────────────────────────────────────────────────────

export async function listSessions(params?: { status?: string; category?: string; courseId?: string; instructorId?: string }): Promise<LyceumSession[]> {
    const q = new URLSearchParams(params as Record<string, string>).toString();
    const res = await fetch(`/api/sessions${q ? `?${q}` : ""}`);
    return res.json() as Promise<LyceumSession[]>;
}

export async function getSession(id: string): Promise<LyceumSession> {
    const res = await fetch(`/api/sessions/${id}`);
    return res.json() as Promise<LyceumSession>;
}

export async function createSession(data: {
    title: string; description: string; category: SessionCategory;
    scheduledAt: string; durationMinutes: number; location: string;
    instructorRateKin: number; studentStipendKin: number;
    capacity?: number | null; courseId?: string | null;
    instructorSplits?: InstructorSplit[];
}): Promise<LyceumSession> {
    const res = await apiFetch("/api/sessions", { method: "POST", body: JSON.stringify(data) });
    return res.json() as Promise<LyceumSession>;
}

export async function submitSession(id: string): Promise<LyceumSession> {
    const res = await apiFetch(`/api/sessions/${id}/submit`, { method: "POST" });
    return res.json() as Promise<LyceumSession>;
}

export async function enrollSession(id: string): Promise<LyceumSession> {
    const res = await apiFetch(`/api/sessions/${id}/enroll`, { method: "POST" });
    return res.json() as Promise<LyceumSession>;
}

export async function dropOutSession(id: string): Promise<LyceumSession> {
    const res = await apiFetch(`/api/sessions/${id}/enroll`, { method: "DELETE" });
    return res.json() as Promise<LyceumSession>;
}

export async function completeSession(id: string, log: AttendanceRecord[]): Promise<LyceumSession> {
    const res = await apiFetch(`/api/sessions/${id}/complete`, { method: "POST", body: JSON.stringify({ log }) });
    return res.json() as Promise<LyceumSession>;
}

export async function cancelSession(id: string): Promise<LyceumSession> {
    const res = await apiFetch(`/api/sessions/${id}`, { method: "DELETE" });
    return res.json() as Promise<LyceumSession>;
}

// ── Courses ───────────────────────────────────────────────────────────────────

export async function listCourses(): Promise<Course[]> {
    const res = await fetch("/api/courses");
    return res.json() as Promise<Course[]>;
}

export async function getCourse(id: string): Promise<Course> {
    const res = await fetch(`/api/courses/${id}`);
    return res.json() as Promise<Course>;
}

export async function createCourse(data: {
    title: string; description: string; category: SessionCategory; prerequisites?: string;
}): Promise<Course> {
    const res = await apiFetch("/api/courses", { method: "POST", body: JSON.stringify(data) });
    return res.json() as Promise<Course>;
}

export async function enrollCourse(id: string): Promise<Course> {
    const res = await apiFetch(`/api/courses/${id}/enroll`, { method: "POST" });
    return res.json() as Promise<Course>;
}

// ── Class Requests ────────────────────────────────────────────────────────────

export async function listRequests(): Promise<ClassRequest[]> {
    const res = await fetch("/api/class-requests");
    return res.json() as Promise<ClassRequest[]>;
}

export async function createRequest(data: { title: string; description: string }): Promise<ClassRequest> {
    const res = await apiFetch("/api/class-requests", { method: "POST", body: JSON.stringify(data) });
    return res.json() as Promise<ClassRequest>;
}

export async function upvoteRequest(id: string): Promise<ClassRequest> {
    const res = await apiFetch(`/api/class-requests/${id}/upvote`, { method: "POST" });
    return res.json() as Promise<ClassRequest>;
}

export async function removeUpvote(id: string): Promise<ClassRequest> {
    const res = await apiFetch(`/api/class-requests/${id}/upvote`, { method: "DELETE" });
    return res.json() as Promise<ClassRequest>;
}

export async function claimRequest(id: string, sessionId: string): Promise<ClassRequest> {
    const res = await apiFetch(`/api/class-requests/${id}/claim`, { method: "POST", body: JSON.stringify({ sessionId }) });
    return res.json() as Promise<ClassRequest>;
}
