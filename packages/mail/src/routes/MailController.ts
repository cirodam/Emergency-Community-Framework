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

// ── Inbound from community node (cross-community delivery) ────────────────

/**
 * POST /api/messages/incoming
 * Called by the local community server when it receives a "mail.message.deliver"
 * EcfMessage from another community.  Not authenticated with person credentials;
 * the community server validates the node signature before forwarding here.
 *
 * Body: {
 *   messageId:   string,
 *   threadId:    string,
 *   subject:     string,
 *   fromHandle:  string,  — "handle@src-community"
 *   toPersonIds: string[], — resolved local person IDs (done by community server)
 *   body:        string,
 *   sentAt:      string,
 * }
 */
export function receiveExternalMessage(req: Request, res: Response): void {
    const { messageId, threadId, subject, fromHandle, toPersonIds, body, sentAt } = req.body ?? {};

    if (typeof messageId !== "string" || !messageId) {
        res.status(400).json({ error: "messageId is required" }); return;
    }
    if (typeof threadId !== "string" || !threadId) {
        res.status(400).json({ error: "threadId is required" }); return;
    }
    if (typeof fromHandle !== "string" || !fromHandle) {
        res.status(400).json({ error: "fromHandle is required" }); return;
    }
    if (!Array.isArray(toPersonIds) || !toPersonIds.length || toPersonIds.some((id: unknown) => typeof id !== "string")) {
        res.status(400).json({ error: "toPersonIds must be a non-empty array of strings" }); return;
    }
    if (typeof body !== "string" || !body.trim()) {
        res.status(400).json({ error: "body is required" }); return;
    }

    const stored = svc().storeExternal({
        messageId,
        threadId,
        subject:     typeof subject === "string" ? subject : "(no subject)",
        fromHandle,
        toPersonIds,
        body:        body.trim(),
        sentAt:      typeof sentAt === "string" ? sentAt : new Date().toISOString(),
    });

    if (stored === null) {
        // Already stored — idempotent success
        res.json({ ok: true, duplicate: true });
        return;
    }

    res.status(201).json({ ok: true, messageId: stored.id });
}

// ── Moderation ─────────────────────────────────────────────────────────────

// POST /api/messages/:id/report
export function reportMessage(req: Request & { personId?: string }, res: Response): void {
    const reporterId = req.personId;
    if (!reporterId) { res.status(401).json({ error: "Not authenticated" }); return; }

    const { reason } = req.body ?? {};
    if (typeof reason !== "string") { res.status(400).json({ error: "reason is required" }); return; }

    try {
        const report = svc().reportMessage(req.params.id as string, reporterId, reason);
        res.status(201).json(report);
    } catch (err) {
        const msg = (err as Error).message;
        res.status(msg.includes("not found") ? 404 : 422).json({ error: msg });
    }
}

// GET /api/admin/reports
export function adminListReports(_req: Request, res: Response): void {
    res.json(svc().getReports());
}

// DELETE /api/admin/messages/:id
export function adminDeleteMessage(req: Request, res: Response): void {
    try {
        svc().adminDeleteMessage(req.params.id as string);
        res.status(204).end();
    } catch (err) {
        const msg = (err as Error).message;
        res.status(msg.includes("not found") ? 404 : 422).json({ error: msg });
    }
}

// ── Drafts ─────────────────────────────────────────────────────────────────

// GET /api/drafts
export function listDrafts(req: Request & { personId?: string }, res: Response): void {
    const personId = req.personId;
    if (!personId) { res.status(401).json({ error: "Not authenticated" }); return; }
    res.json(svc().listDrafts(personId));
}

// PUT /api/drafts/:id  (create or update — client generates ID)
// Body: { toPersonIds?, subject?, body? }
export function saveDraft(req: Request & { personId?: string }, res: Response): void {
    const personId = req.personId;
    if (!personId) { res.status(401).json({ error: "Not authenticated" }); return; }

    const id = req.params.id as string;
    const { toPersonIds, subject, body } = req.body ?? {};

    const draft = svc().saveDraft(
        personId,
        id,
        Array.isArray(toPersonIds) ? toPersonIds : [],
        typeof subject === "string" ? subject : "",
        typeof body    === "string" ? body    : "",
    );
    res.json(draft);
}

// DELETE /api/drafts/:id
export function deleteDraft(req: Request & { personId?: string }, res: Response): void {
    const personId = req.personId;
    if (!personId) { res.status(401).json({ error: "Not authenticated" }); return; }

    try {
        svc().deleteDraft(req.params.id as string, personId);
        res.status(204).end();
    } catch (err) {
        const e = err instanceof Error ? err.message : "Error";
        res.status(e === "Forbidden" ? 403 : 404).json({ error: e });
    }
}

// ── Archive ────────────────────────────────────────────────────────────────

// GET /api/threads?filter=active|archived|all  (replaces plain listThreads for archive support)
export function listThreadsFiltered(req: Request & { personId?: string }, res: Response): void {
    const personId = req.personId;
    if (!personId) { res.status(401).json({ error: "Not authenticated" }); return; }
    const filter = (req.query["filter"] as string) === "archived" ? "archived"
                 : (req.query["filter"] as string) === "all"      ? "all"
                 : "active";
    res.json(svc().threadsForPersonFiltered(personId, filter));
}

// PATCH /api/threads/:id/archive
// Body: { archived: boolean }
export function archiveThread(req: Request & { personId?: string }, res: Response): void {
    const personId = req.personId;
    if (!personId) { res.status(401).json({ error: "Not authenticated" }); return; }

    const { archived } = req.body ?? {};
    if (typeof archived !== "boolean") { res.status(400).json({ error: "archived (boolean) is required" }); return; }

    try {
        svc().setThreadArchived(req.params.id as string, personId, archived);
        res.json({ ok: true });
    } catch (err) {
        const e = err instanceof Error ? err.message : "Error";
        res.status(e === "Forbidden" ? 403 : 404).json({ error: e });
    }
}

// ── Search ─────────────────────────────────────────────────────────────────

// GET /api/search?q=
export function searchMessages(req: Request & { personId?: string }, res: Response): void {
    const personId = req.personId;
    if (!personId) { res.status(401).json({ error: "Not authenticated" }); return; }

    const q = typeof req.query["q"] === "string" ? req.query["q"].trim() : "";
    if (!q) { res.json([]); return; }

    res.json(svc().search(q, personId));
}

// ── Trash ──────────────────────────────────────────────────────────────────

// GET /api/trash
export function getTrash(req: Request & { personId?: string }, res: Response): void {
    const personId = req.personId;
    if (!personId) { res.status(401).json({ error: "Not authenticated" }); return; }
    res.json(svc().trash(personId));
}

// POST /api/trash/:id/restore
export function restoreMessage(req: Request & { personId?: string }, res: Response): void {
    const personId = req.personId;
    if (!personId) { res.status(401).json({ error: "Not authenticated" }); return; }
    try {
        svc().restore(req.params.id as string, personId);
        res.json({ ok: true });
    } catch (err) {
        const e = err instanceof Error ? err.message : "Error";
        res.status(e.includes("not found") ? 404 : 422).json({ error: e });
    }
}

// DELETE /api/trash/:id
export function permanentDeleteMessage(req: Request & { personId?: string }, res: Response): void {
    const personId = req.personId;
    if (!personId) { res.status(401).json({ error: "Not authenticated" }); return; }
    try {
        svc().permanentDelete(req.params.id as string, personId);
        res.status(204).end();
    } catch (err) {
        const e = err instanceof Error ? err.message : "Error";
        res.status(e.includes("not found") ? 404 : 422).json({ error: e });
    }
}

// DELETE /api/trash
export function emptyTrash(req: Request & { personId?: string }, res: Response): void {
    const personId = req.personId;
    if (!personId) { res.status(401).json({ error: "Not authenticated" }); return; }
    const count = svc().emptyTrash(personId);
    res.json({ deleted: count });
}
