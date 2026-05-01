import { getToken, session } from "./session.js";

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

// ── Types ─────────────────────────────────────────────────────────────────────

export interface MessageDto {
    id:                  string;
    threadId:            string;
    fromPersonId:        string;
    toPersonIds:         string[];
    subject:             string;
    body:                string;
    sentAt:              string;
    readAt:              string | null;
    deletedBySender:     boolean;
    deletedByRecipient:  boolean;
}

export interface ThreadDto {
    id:             string;
    subject:        string;
    participantIds: string[];
    lastMessageAt:  string;
}

export interface ThreadDetail {
    thread:   ThreadDto;
    messages: MessageDto[];
}

// ── API calls ─────────────────────────────────────────────────────────────────

export async function getThread(id: string): Promise<ThreadDetail> {
    const res = await apiFetch(`/api/threads/${id}`);
    if (!res.ok) throw new Error("Thread not found");
    return res.json() as Promise<ThreadDetail>;
}

export async function getInbox(): Promise<MessageDto[]> {
    const res = await apiFetch("/api/inbox");
    if (!res.ok) throw new Error("Failed to load inbox");
    return res.json() as Promise<MessageDto[]>;
}

export async function getOutbox(): Promise<MessageDto[]> {
    const res = await apiFetch("/api/outbox");
    if (!res.ok) throw new Error("Failed to load outbox");
    return res.json() as Promise<MessageDto[]>;
}

export async function getUnreadCount(): Promise<number> {
    const res = await apiFetch("/api/unread-count");
    if (!res.ok) return 0;
    const data = await res.json() as { count: number };
    return data.count;
}

export async function sendMessage(
    toPersonId: string,
    subject: string,
    body: string,
    threadId?: string,
): Promise<MessageDto> {
    const res = await apiFetch("/api/messages", {
        method: "POST",
        body:   JSON.stringify({ toPersonId, subject, body, threadId }),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? "Failed to send message");
    }
    return res.json() as Promise<MessageDto>;
}

export async function markRead(id: string): Promise<MessageDto> {
    const res = await apiFetch(`/api/messages/${id}/read`, { method: "PATCH" });
    if (!res.ok) throw new Error("Failed to mark as read");
    return res.json() as Promise<MessageDto>;
}

export async function deleteMessage(id: string): Promise<void> {
    const res = await apiFetch(`/api/messages/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete message");
}

// ── Moderation ────────────────────────────────────────────────────────────────

export interface MessageReport {
    id:         string;
    messageId:  string;
    reporterId: string;
    reason:     string;
    reportedAt: string;
    message:    MessageDto | null;
}

export async function reportMessage(id: string, reason: string): Promise<MessageReport> {
    const res = await apiFetch(`/api/messages/${encodeURIComponent(id)}/report`, {
        method: "POST",
        body:   JSON.stringify({ reason }),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? "Failed to report message");
    }
    return res.json() as Promise<MessageReport>;
}

export async function getAdminReports(): Promise<MessageReport[]> {
    const res = await apiFetch("/api/admin/reports");
    if (!res.ok) throw new Error("Failed to load reports");
    return res.json() as Promise<MessageReport[]>;
}

export async function adminDeleteMessage(id: string): Promise<void> {
    const res = await apiFetch(`/api/admin/messages/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? "Failed to delete message");
    }
}

// ── Drafts ────────────────────────────────────────────────────────────────────

export interface DraftDto {
    id:          string;
    personId:    string;
    toPersonIds: string[];
    subject:     string;
    body:        string;
    updatedAt:   string;
}

export async function listDrafts(): Promise<DraftDto[]> {
    const res = await apiFetch("/api/drafts");
    if (!res.ok) throw new Error("Failed to load drafts");
    return res.json() as Promise<DraftDto[]>;
}

export async function saveDraft(id: string, toPersonIds: string[], subject: string, body: string): Promise<DraftDto> {
    const res = await apiFetch(`/api/drafts/${encodeURIComponent(id)}`, {
        method: "PUT",
        body:   JSON.stringify({ toPersonIds, subject, body }),
    });
    if (!res.ok) throw new Error("Failed to save draft");
    return res.json() as Promise<DraftDto>;
}

export async function deleteDraft(id: string): Promise<void> {
    const res = await apiFetch(`/api/drafts/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete draft");
}

// ── Archive ───────────────────────────────────────────────────────────────────

export async function listThreads(filter: "active" | "archived" | "all" = "active"): Promise<ThreadDto[]> {
    const res = await apiFetch(`/api/threads?filter=${filter}`);
    if (!res.ok) throw new Error("Failed to load threads");
    return res.json() as Promise<ThreadDto[]>;
}

export async function archiveThread(id: string, archived: boolean): Promise<void> {
    const res = await apiFetch(`/api/threads/${encodeURIComponent(id)}/archive`, {
        method: "PATCH",
        body:   JSON.stringify({ archived }),
    });
    if (!res.ok) throw new Error("Failed to archive thread");
}

// ── Search ────────────────────────────────────────────────────────────────────

export async function searchMessages(q: string): Promise<MessageDto[]> {
    const res = await apiFetch(`/api/search?q=${encodeURIComponent(q)}`);
    if (!res.ok) throw new Error("Search failed");
    return res.json() as Promise<MessageDto[]>;
}

// ── Trash ─────────────────────────────────────────────────────────────────────

export async function getTrash(): Promise<MessageDto[]> {
    const res = await apiFetch(`/api/trash`);
    if (!res.ok) throw new Error("Failed to load trash");
    return res.json() as Promise<MessageDto[]>;
}

export async function restoreMessage(id: string): Promise<void> {
    const res = await apiFetch(`/api/trash/${id}/restore`, { method: "POST" });
    if (!res.ok) throw new Error("Failed to restore message");
}

export async function permanentDeleteMessage(id: string): Promise<void> {
    const res = await apiFetch(`/api/trash/${id}`, { method: "DELETE" });
    if (!res.ok && res.status !== 204) throw new Error("Failed to delete message");
}

export async function emptyTrash(): Promise<number> {
    const res = await apiFetch(`/api/trash`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to empty trash");
    const json = await res.json() as { deleted: number };
    return json.deleted;
}
