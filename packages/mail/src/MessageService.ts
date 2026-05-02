import { randomUUID } from "crypto";
import { Message } from "./Message.js";
import { MessageReceipt } from "./MessageReceipt.js";
import { MessageReport } from "./MessageReport.js";
import { Thread } from "./Thread.js";
import { Draft } from "./Draft.js";
import { MessageLoader } from "./MessageLoader.js";

export class MessageService {
    private static instance: MessageService;
    private loader!: MessageLoader;
    private messages: Map<string, Message>        = new Map();
    private receipts: Map<string, MessageReceipt> = new Map();
    private threads:  Map<string, Thread>          = new Map();
    private reports:  Map<string, MessageReport>  = new Map();

    static getInstance(): MessageService {
        if (!MessageService.instance) MessageService.instance = new MessageService();
        return MessageService.instance;
    }

    init(loader: MessageLoader): void {
        this.loader = loader;

        for (const t of loader.loadAllThreads())  this.threads.set(t.id, t);
        for (const m of loader.loadAllMessages()) this.messages.set(m.id, m);
        for (const r of loader.loadAllReceipts()) this.receipts.set(r.id, r);
        for (const r of loader.loadAllReports())  this.reports.set(r.id, r);

        // ── Migration: convert legacy single-recipient messages ────────────
        // Old Message had toPersonId / readAt / deletedBySender / deletedByRecipient.
        // If any such messages exist with no receipts yet, generate receipts for them.
        for (const msg of this.messages.values()) {
            const legacy = msg as Message & {
                toPersonId?: string;
                readAt?: string | null;
                deletedByRecipient?: boolean;
            };
            if (!legacy.toPersonId) continue; // already new format

            const hasReceipt = [...this.receipts.values()].some(r => r.messageId === msg.id);
            if (hasReceipt) continue;

            const receipt: MessageReceipt = {
                id:        randomUUID(),
                messageId: msg.id,
                personId:  legacy.toPersonId,
                readAt:    legacy.readAt ?? null,
                deleted:   legacy.deletedByRecipient ?? false,
            };
            this.receipts.set(receipt.id, receipt);
            loader.saveReceipt(receipt);

            // Upgrade the stored message to the new shape
            const upgraded: Message = {
                id:           msg.id,
                threadId:     msg.threadId,
                fromPersonId: msg.fromPersonId,
                fromHandle:   (msg as Message & { fromHandle?: string }).fromHandle ?? msg.fromPersonId,
                toPersonIds:  msg.toPersonIds?.length ? msg.toPersonIds : [legacy.toPersonId],
                toHandles:    (msg as Message & { toHandles?: string[] }).toHandles ?? [],
                subject:      msg.subject,
                body:         msg.body,
                sentAt:       msg.sentAt,
            };
            this.messages.set(msg.id, upgraded);
            loader.saveMessage(upgraded);
        }

        // ── Migration: fill missing fromHandle / toHandles on existing messages ──
        for (const msg of this.messages.values()) {
            if (!msg.fromHandle) {
                const patched: Message = {
                    ...msg,
                    fromHandle: msg.fromPersonId,
                    toHandles:  msg.toHandles?.length ? msg.toHandles : msg.toPersonIds,
                };
                this.messages.set(msg.id, patched);
                loader.saveMessage(patched);
            }
        }
        // ── Migration: fill missing participantHandles on existing threads ────
        for (const thread of this.threads.values()) {
            if (!thread.participantHandles?.length) {
                const patched: Thread = { ...thread, participantHandles: thread.participantIds };
                this.threads.set(thread.id, patched);
                loader.saveThread(patched);
            }
        }
    }

    // ── Send ───────────────────────────────────────────────────────────────

    /**
     * Send a message from `fromPersonId` to one or more recipients.
     *
     * `fromHandle` is the sender's handle (from their auth credential).
     * `toPersonIds` / `toHandles` are parallel arrays — same length and order.
     *
     * If `existingThreadId` is provided the message is appended to that thread
     * (sender must be a participant). Otherwise a new thread is created.
     *
     * Returns the saved message.
     */
    send(
        fromPersonId: string,
        fromHandle: string,
        toPersonIds: string[],
        toHandles: string[],
        subject: string,
        body: string,
        existingThreadId?: string,
    ): Message {
        if (!toPersonIds.length) throw new Error("At least one recipient is required");
        const uniqueRecipients = [...new Set(toPersonIds.filter(id => id !== fromPersonId))];
        if (!uniqueRecipients.length) throw new Error("Cannot send a message only to yourself");

        // Deduplicate handles in parallel with IDs
        const seenIds = new Set<string>();
        const uniqueHandles: string[] = [];
        for (let i = 0; i < toPersonIds.length; i++) {
            const id = toPersonIds[i];
            if (id !== fromPersonId && !seenIds.has(id)) {
                seenIds.add(id);
                uniqueHandles.push(toHandles[i] ?? id);
            }
        }

        const now = new Date().toISOString();

        // Resolve or create thread
        let thread: Thread;
        if (existingThreadId) {
            const existing = this.threads.get(existingThreadId);
            if (!existing) throw new Error("Thread not found");
            if (!existing.participantIds.includes(fromPersonId))
                throw new Error("Forbidden: not a thread participant");
            const allParticipants = [...new Set([...existing.participantIds, fromPersonId, ...uniqueRecipients])];
            // Merge handles: keep existing, add new ones for new participants
            const existingHandleMap = new Map(existing.participantIds.map((id, i) => [id, existing.participantHandles?.[i] ?? id]));
            existingHandleMap.set(fromPersonId, fromHandle);
            uniqueRecipients.forEach((id, i) => existingHandleMap.set(id, uniqueHandles[i] ?? id));
            const allHandles = allParticipants.map(id => existingHandleMap.get(id) ?? id);
            thread = { ...existing, participantIds: allParticipants, participantHandles: allHandles, lastMessageAt: now };
        } else {
            const allParticipantIds = [...new Set([fromPersonId, ...uniqueRecipients])];
            const handleMap = new Map([[fromPersonId, fromHandle], ...uniqueRecipients.map((id, i) => [id, uniqueHandles[i] ?? id] as [string, string])]);
            thread = {
                id:                 randomUUID(),
                subject:            subject.trim() || "(no subject)",
                participantIds:     allParticipantIds,
                participantHandles: allParticipantIds.map(id => handleMap.get(id) ?? id),
                lastMessageAt:      now,
            };
        }

        const msg: Message = {
            id:           randomUUID(),
            threadId:     thread.id,
            fromPersonId,
            fromHandle,
            toPersonIds:  uniqueRecipients,
            toHandles:    uniqueHandles,
            subject:      thread.subject,
            body,
            sentAt:       now,
        };

        // One receipt per recipient
        const newReceipts: MessageReceipt[] = uniqueRecipients.map(personId => ({
            id:        randomUUID(),
            messageId: msg.id,
            personId,
            readAt:    null,
            deleted:   false,
        }));

        this.messages.set(msg.id, msg);
        this.threads.set(thread.id, thread);
        this.loader.saveMessage(msg);
        this.loader.saveThread(thread);
        for (const r of newReceipts) {
            this.receipts.set(r.id, r);
            this.loader.saveReceipt(r);
        }

        return msg;
    }

    // ── External (cross-community) delivery ───────────────────────────────

    /**
     * Store an inbound message delivered from another community node.
     *
     * The message retains its original `messageId` and `threadId` so that
     * re-delivery is idempotent. `fromHandle` (e.g. "bob@src-community") is
     * stored in `fromPersonId` with an "external:" prefix so the UI can
     * display it correctly without confusing it with a local person ID.
     *
     * Returns the stored message, or `null` if the message already exists
     * (idempotent).
     */
    storeExternal(params: {
        messageId:   string;
        threadId:    string;
        subject:     string;
        fromHandle:  string;  // "handle@community-handle"
        toPersonIds: string[];
        toHandles:   string[]; // parallel array of local-person handles
        body:        string;
        sentAt:      string;
    }): Message | null {
        const { messageId, threadId, subject, fromHandle, toPersonIds, toHandles, body, sentAt } = params;

        // Idempotency — skip if already stored
        if (this.messages.has(messageId)) return null;

        const syntheticFromId = `external:${fromHandle}`;

        // Resolve or create thread
        let thread = this.threads.get(threadId);
        if (!thread) {
            const allParticipantIds = [...new Set([syntheticFromId, ...toPersonIds])];
            const handleMap = new Map([[syntheticFromId, fromHandle], ...toPersonIds.map((id, i) => [id, toHandles[i] ?? id] as [string, string])]);
            thread = {
                id:                 threadId,
                subject:            subject.trim() || "(no subject)",
                participantIds:     allParticipantIds,
                participantHandles: allParticipantIds.map(id => handleMap.get(id) ?? id),
                lastMessageAt:      sentAt,
            };
        } else {
            // Add any new local recipients to existing thread
            const allParticipants = [...new Set([...thread.participantIds, ...toPersonIds])];
            const existingHandleMap = new Map((thread.participantIds).map((id, i) => [id, thread!.participantHandles?.[i] ?? id]));
            existingHandleMap.set(syntheticFromId, fromHandle);
            toPersonIds.forEach((id, i) => existingHandleMap.set(id, toHandles[i] ?? id));
            thread = { ...thread, participantIds: allParticipants, participantHandles: allParticipants.map(id => existingHandleMap.get(id) ?? id), lastMessageAt: sentAt };
        }

        const msg: Message = {
            id:           messageId,
            threadId:     thread.id,
            fromPersonId: syntheticFromId,
            fromHandle,
            toPersonIds,
            toHandles:    toHandles.length ? toHandles : toPersonIds,
            subject:      thread.subject,
            body,
            sentAt,
        };

        const newReceipts: MessageReceipt[] = toPersonIds.map(personId => ({
            id:        randomUUID(),
            messageId: msg.id,
            personId,
            readAt:    null,
            deleted:   false,
        }));

        this.messages.set(msg.id, msg);
        this.threads.set(thread.id, thread);
        this.loader.saveMessage(msg);
        this.loader.saveThread(thread);
        for (const r of newReceipts) {
            this.receipts.set(r.id, r);
            this.loader.saveReceipt(r);
        }

        return msg;
    }

    // ── Inbox / Outbox ─────────────────────────────────────────────────────

    /** Messages received by personId that haven't been deleted. */
    inbox(personId: string): Message[] {
        const activeReceiptMessageIds = new Set(
            [...this.receipts.values()]
                .filter(r => r.personId === personId && !r.deleted)
                .map(r => r.messageId),
        );
        return [...this.messages.values()]
            .filter(m => activeReceiptMessageIds.has(m.id))
            .sort((a, b) => b.sentAt.localeCompare(a.sentAt));
    }

    /** Messages sent by personId. Soft-delete not yet implemented for sender. */
    outbox(personId: string): Message[] {
        return [...this.messages.values()]
            .filter(m => m.fromPersonId === personId)
            .sort((a, b) => b.sentAt.localeCompare(a.sentAt));
    }

    unreadCount(personId: string): number {
        return [...this.receipts.values()]
            .filter(r => r.personId === personId && !r.readAt && !r.deleted)
            .length;
    }

    // ── Threads ────────────────────────────────────────────────────────────

    threadsForPerson(personId: string): Thread[] {
        return [...this.threads.values()]
            .filter(t => t.participantIds.includes(personId))
            .sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));
    }

    messagesInThread(threadId: string, personId: string): Message[] {
        return [...this.messages.values()]
            .filter(m => {
                if (m.threadId !== threadId) return false;
                if (m.fromPersonId === personId) return true;
                const receipt = [...this.receipts.values()].find(
                    r => r.messageId === m.id && r.personId === personId,
                );
                return receipt ? !receipt.deleted : false;
            })
            .sort((a, b) => a.sentAt.localeCompare(b.sentAt));
    }

    // ── Mutations ──────────────────────────────────────────────────────────

    markRead(messageId: string, personId: string): MessageReceipt {
        const receipt = [...this.receipts.values()].find(
            r => r.messageId === messageId && r.personId === personId,
        );
        if (!receipt) throw new Error("Message not found");
        if (receipt.readAt) return receipt; // already read
        const updated: MessageReceipt = { ...receipt, readAt: new Date().toISOString() };
        this.receipts.set(receipt.id, updated);
        this.loader.saveReceipt(updated);
        return updated;
    }

    softDelete(messageId: string, personId: string): void {
        const msg = this.messages.get(messageId);
        if (!msg) throw new Error("Message not found");

        // Recipient deletes their receipt
        const receipt = [...this.receipts.values()].find(
            r => r.messageId === messageId && r.personId === personId,
        );
        if (receipt) {
            const updated: MessageReceipt = { ...receipt, deleted: true };
            this.receipts.set(receipt.id, updated);
            this.loader.saveReceipt(updated);
            return;
        }

        // Sender can't "delete" a sent message — it's already delivered
        if (msg.fromPersonId === personId) throw new Error("Sent messages cannot be deleted");

        throw new Error("Forbidden");
    }

    getMessage(id: string): Message | undefined {
        return this.messages.get(id);
    }

    getThread(id: string): Thread | undefined {
        return this.threads.get(id);
    }

    // ── Moderation ─────────────────────────────────────────────────────────

    /** Report a message for moderation review. Idempotent per reporter+message. */
    reportMessage(messageId: string, reporterId: string, reason: string): MessageReport {
        const msg = this.messages.get(messageId);
        if (!msg) throw new Error("Message not found");
        // Prevent duplicate reports from the same person
        const existing = [...this.reports.values()].find(
            r => r.messageId === messageId && r.reporterId === reporterId,
        );
        if (existing) return existing;
        const report: MessageReport = {
            id:         randomUUID(),
            messageId,
            reporterId,
            reason:     reason.trim() || "(no reason given)",
            reportedAt: new Date().toISOString(),
        };
        this.reports.set(report.id, report);
        this.loader.saveReport(report);
        return report;
    }

    /** Return all reports (most recent first), enriched with the message body for moderator display. */
    getReports(): Array<MessageReport & { message: Message | null }> {
        return [...this.reports.values()]
            .sort((a, b) => b.reportedAt.localeCompare(a.reportedAt))
            .map(r => ({ ...r, message: this.messages.get(r.messageId) ?? null }));
    }

    /** Hard-delete a message and all its receipts/reports. For moderator use only. */
    adminDeleteMessage(messageId: string): void {
        const msg = this.messages.get(messageId);
        if (!msg) throw new Error("Message not found");
        this.messages.delete(messageId);
        this.loader.deleteMessage(messageId);
        // Remove receipts from memory (receipts on disk remain but message is gone)
        for (const [rid, r] of this.receipts) {
            if (r.messageId === messageId) this.receipts.delete(rid);
        }
        // Remove reports from memory
        for (const [rid, r] of this.reports) {
            if (r.messageId === messageId) this.reports.delete(rid);
        }
    }

    // ── Trash ──────────────────────────────────────────────────────────────

    /** Messages the person has soft-deleted (receipt.deleted = true). */
    trash(personId: string): Message[] {
        const deletedReceiptMessageIds = new Set(
            [...this.receipts.values()]
                .filter(r => r.personId === personId && r.deleted)
                .map(r => r.messageId),
        );
        return [...this.messages.values()]
            .filter(m => deletedReceiptMessageIds.has(m.id))
            .sort((a, b) => b.sentAt.localeCompare(a.sentAt));
    }

    /** Move a trashed message back to inbox (set receipt.deleted = false). */
    restore(messageId: string, personId: string): void {
        const receipt = [...this.receipts.values()].find(
            r => r.messageId === messageId && r.personId === personId,
        );
        if (!receipt) throw new Error("Message not found in trash");
        if (!receipt.deleted) return; // already in inbox
        const updated: MessageReceipt = { ...receipt, deleted: false };
        this.receipts.set(receipt.id, updated);
        this.loader.saveReceipt(updated);
    }

    /** Permanently delete a single message from trash (removes receipt entirely). */
    permanentDelete(messageId: string, personId: string): void {
        const receipt = [...this.receipts.values()].find(
            r => r.messageId === messageId && r.personId === personId && r.deleted,
        );
        if (!receipt) throw new Error("Message not found in trash");
        this.receipts.delete(receipt.id);
        this.loader.deleteReceipt(receipt.id);
    }

    /** Permanently delete all trashed messages for personId. */
    emptyTrash(personId: string): number {
        const toDelete = [...this.receipts.values()].filter(
            r => r.personId === personId && r.deleted,
        );
        for (const r of toDelete) this.receipts.delete(r.id);
        this.loader.deleteReceiptsForPerson(personId, true);
        return toDelete.length;
    }

    saveDraft(personId: string, id: string | undefined, toHandles: string[], subject: string, body: string): Draft {
        const draft: Draft = {
            id:          id ?? randomUUID(),
            personId,
            toHandles,
            subject,
            body,
            updatedAt:   new Date().toISOString(),
        };
        this.loader.saveDraft(draft);
        return draft;
    }

    getDraft(id: string, personId: string): Draft {
        const draft = this.loader.loadDraft(id);
        if (!draft) throw new Error("Draft not found");
        if (draft.personId !== personId) throw new Error("Forbidden");
        return draft;
    }

    listDrafts(personId: string): Draft[] {
        return this.loader.loadDraftsForPerson(personId);
    }

    deleteDraft(id: string, personId: string): void {
        const draft = this.loader.loadDraft(id);
        if (!draft) throw new Error("Draft not found");
        if (draft.personId !== personId) throw new Error("Forbidden");
        this.loader.deleteDraft(id);
    }

    // ── Archive ────────────────────────────────────────────────────────────

    setThreadArchived(threadId: string, personId: string, archived: boolean): void {
        const thread = this.threads.get(threadId);
        if (!thread) throw new Error("Thread not found");
        if (!thread.participantIds.includes(personId)) throw new Error("Forbidden");
        this.loader.setThreadArchived(threadId, personId, archived);
    }

    /** All threads for person, optionally filtered to archived-only or excluding archived. */
    threadsForPersonFiltered(personId: string, filter: "all" | "active" | "archived"): Thread[] {
        const archived = this.loader.loadArchivedThreadIds(personId);
        return [...this.threads.values()]
            .filter(t => {
                if (!t.participantIds.includes(personId)) return false;
                const isArchived = archived.has(t.id);
                if (filter === "archived") return isArchived;
                if (filter === "active")   return !isArchived;
                return true;
            })
            .sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));
    }

    // ── Search ─────────────────────────────────────────────────────────────

    /** Full-text search over messages the person can see. Returns matching messages newest-first. */
    search(query: string, personId: string): Message[] {
        if (!query.trim()) return [];
        // Escape FTS5 special chars to avoid query parse errors
        const escaped = query.replace(/["]/g, '""');
        let ids: string[];
        try {
            ids = this.loader.searchMessageIds(`"${escaped}"`);
        } catch {
            // Fall back to prefix match without quotes
            ids = this.loader.searchMessageIds(escaped);
        }
        return ids
            .map(id => this.messages.get(id))
            .filter((m): m is Message => {
                if (!m) return false;
                if (m.fromPersonId === personId) return true;
                return [...this.receipts.values()].some(r => r.messageId === m.id && r.personId === personId && !r.deleted);
            })
            .sort((a, b) => b.sentAt.localeCompare(a.sentAt));
    }
}
