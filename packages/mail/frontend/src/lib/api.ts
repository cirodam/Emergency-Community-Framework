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

export async function listThreads(): Promise<ThreadDto[]> {
    const res = await apiFetch("/api/threads");
    if (!res.ok) throw new Error("Failed to load threads");
    return res.json() as Promise<ThreadDto[]>;
}

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
