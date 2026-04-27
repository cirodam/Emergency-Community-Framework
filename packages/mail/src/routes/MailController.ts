import { Request, Response } from "express";
import { MessageService } from "../MessageService.js";

function svc(): MessageService { return MessageService.getInstance(); }

// ── Threads ────────────────────────────────────────────────────────────────

// GET /api/threads
export function listThreads(req: Request & { personId?: string }, res: Response): void {
    const personId = req.personId;
    if (!personId) { res.status(401).json({ error: "Not authenticated" }); return; }
    res.json(svc().threadsForPerson(personId));
}

// GET /api/threads/:id
export function getThread(req: Request & { personId?: string }, res: Response): void {
    const personId = req.personId;
    if (!personId) { res.status(401).json({ error: "Not authenticated" }); return; }

    const thread = svc().getThread(req.params.id as string);
    if (!thread) { res.status(404).json({ error: "Thread not found" }); return; }
    if (!thread.participantIds.includes(personId)) {
        res.status(403).json({ error: "Forbidden" }); return;
    }

    const messages = svc().messagesInThread(thread.id, personId);
    res.json({ thread, messages });
}

// ── Inbox / Outbox ─────────────────────────────────────────────────────────

// GET /api/inbox
export function getInbox(req: Request & { personId?: string }, res: Response): void {
    const personId = req.personId;
    if (!personId) { res.status(401).json({ error: "Not authenticated" }); return; }
    res.json(svc().inbox(personId));
}

// GET /api/outbox
export function getOutbox(req: Request & { personId?: string }, res: Response): void {
    const personId = req.personId;
    if (!personId) { res.status(401).json({ error: "Not authenticated" }); return; }
    res.json(svc().outbox(personId));
}

// GET /api/unread-count
export function getUnreadCount(req: Request & { personId?: string }, res: Response): void {
    const personId = req.personId;
    if (!personId) { res.status(401).json({ error: "Not authenticated" }); return; }
    res.json({ count: svc().unreadCount(personId) });
}

// ── Send ───────────────────────────────────────────────────────────────────

// POST /api/messages
// Body: { toPersonIds: string[], subject?, body, threadId? }
//       toPersonIds may also be sent as the legacy toPersonId: string for
//       backwards compat with existing clients.
export function sendMessage(req: Request & { personId?: string }, res: Response): void {
    const fromPersonId = req.personId;
    if (!fromPersonId) { res.status(401).json({ error: "Not authenticated" }); return; }

    const { toPersonIds, toPersonId, subject, body, threadId } = req.body ?? {};

    // Accept both array and legacy single-string form
    const recipients: string[] = Array.isArray(toPersonIds)
        ? toPersonIds
        : typeof toPersonId === "string" && toPersonId.trim()
            ? [toPersonId.trim()]
            : [];

    if (!recipients.length) {
        res.status(400).json({ error: "toPersonIds is required" }); return;
    }
    if (typeof body !== "string" || !body.trim()) {
        res.status(400).json({ error: "body is required" }); return;
    }

    const subjectStr = typeof subject === "string" ? subject : "";

    try {
        const msg = svc().send(fromPersonId, recipients, subjectStr, body.trim(), threadId as string | undefined);
        res.status(201).json(msg);
    } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to send";
        res.status(422).json({ error: msg });
    }
}

// ── Mark read ──────────────────────────────────────────────────────────────

// PATCH /api/messages/:id/read
export function markRead(req: Request & { personId?: string }, res: Response): void {
    const personId = req.personId;
    if (!personId) { res.status(401).json({ error: "Not authenticated" }); return; }

    try {
        const receipt = svc().markRead(req.params.id as string, personId);
        res.json(receipt);
    } catch (err) {
        const e = err instanceof Error ? err.message : "Error";
        const status = e === "Forbidden" ? 403 : e === "Message not found" ? 404 : 422;
        res.status(status).json({ error: e });
    }
}

// ── Delete ─────────────────────────────────────────────────────────────────

// DELETE /api/messages/:id
export function deleteMessage(req: Request & { personId?: string }, res: Response): void {
    const personId = req.personId;
    if (!personId) { res.status(401).json({ error: "Not authenticated" }); return; }

    try {
        svc().softDelete(req.params.id as string, personId);
        res.status(204).end();
    } catch (err) {
        const e = err instanceof Error ? err.message : "Error";
        const status = e === "Forbidden" ? 403 : e === "Message not found" ? 404 : 422;
        res.status(status).json({ error: e });
    }
}
