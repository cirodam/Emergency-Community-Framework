import { randomUUID } from "crypto";
import { Message } from "./Message.js";
import { Thread } from "./Thread.js";
import { MessageLoader } from "./MessageLoader.js";

export class MessageService {
    private static instance: MessageService;
    private loader!: MessageLoader;
    private messages: Map<string, Message> = new Map();
    private threads:  Map<string, Thread>  = new Map();

    static getInstance(): MessageService {
        if (!MessageService.instance) MessageService.instance = new MessageService();
        return MessageService.instance;
    }

    init(loader: MessageLoader): void {
        this.loader = loader;

        // Restore from disk
        for (const t of loader.loadAllThreads())  this.threads.set(t.id, t);
        for (const m of loader.loadAllMessages()) this.messages.set(m.id, m);
    }

    // ── Send ───────────────────────────────────────────────────────────────

    send(fromPersonId: string, toPersonId: string, subject: string, body: string, existingThreadId?: string): Message {
        const now = new Date().toISOString();

        // Resolve or create thread
        let thread: Thread;
        if (existingThreadId) {
            const existing = this.threads.get(existingThreadId);
            if (!existing) throw new Error("Thread not found");
            thread = { ...existing, lastMessageAt: now };
            if (!thread.participantIds.includes(fromPersonId)) thread.participantIds.push(fromPersonId);
            if (!thread.participantIds.includes(toPersonId))   thread.participantIds.push(toPersonId);
        } else {
            thread = {
                id:             randomUUID(),
                subject:        subject.trim() || "(no subject)",
                participantIds: [fromPersonId, toPersonId],
                lastMessageAt:  now,
            };
        }

        const msg: Message = {
            id:                  randomUUID(),
            threadId:            thread.id,
            fromPersonId,
            toPersonId,
            subject:             thread.subject,
            body,
            sentAt:              now,
            readAt:              null,
            deletedBySender:     false,
            deletedByRecipient:  false,
        };

        this.messages.set(msg.id, msg);
        this.threads.set(thread.id, thread);
        this.loader.saveMessage(msg);
        this.loader.saveThread(thread);

        return msg;
    }

    // ── Inbox / Outbox ─────────────────────────────────────────────────────

    inbox(personId: string): Message[] {
        return [...this.messages.values()]
            .filter(m => m.toPersonId === personId && !m.deletedByRecipient)
            .sort((a, b) => b.sentAt.localeCompare(a.sentAt));
    }

    outbox(personId: string): Message[] {
        return [...this.messages.values()]
            .filter(m => m.fromPersonId === personId && !m.deletedBySender)
            .sort((a, b) => b.sentAt.localeCompare(a.sentAt));
    }

    unreadCount(personId: string): number {
        return [...this.messages.values()]
            .filter(m => m.toPersonId === personId && !m.readAt && !m.deletedByRecipient)
            .length;
    }

    // ── Threads ────────────────────────────────────────────────────────────

    threadsForPerson(personId: string): Thread[] {
        const myMessages = [...this.messages.values()].filter(
            m => (m.fromPersonId === personId && !m.deletedBySender) ||
                 (m.toPersonId   === personId && !m.deletedByRecipient),
        );
        const threadIds = new Set(myMessages.map(m => m.threadId));
        return [...this.threads.values()]
            .filter(t => threadIds.has(t.id))
            .sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));
    }

    messagesInThread(threadId: string, personId: string): Message[] {
        return [...this.messages.values()]
            .filter(m => m.threadId === threadId && (
                (m.fromPersonId === personId && !m.deletedBySender) ||
                (m.toPersonId   === personId && !m.deletedByRecipient)
            ))
            .sort((a, b) => a.sentAt.localeCompare(b.sentAt));
    }

    // ── Mutations ──────────────────────────────────────────────────────────

    markRead(id: string, personId: string): Message {
        const msg = this.messages.get(id);
        if (!msg) throw new Error("Message not found");
        if (msg.toPersonId !== personId) throw new Error("Forbidden");
        if (msg.readAt) return msg; // already read
        const updated: Message = { ...msg, readAt: new Date().toISOString() };
        this.messages.set(id, updated);
        this.loader.saveMessage(updated);
        return updated;
    }

    softDelete(id: string, personId: string): void {
        const msg = this.messages.get(id);
        if (!msg) throw new Error("Message not found");
        let updated: Message;
        if (msg.fromPersonId === personId) {
            updated = { ...msg, deletedBySender: true };
        } else if (msg.toPersonId === personId) {
            updated = { ...msg, deletedByRecipient: true };
        } else {
            throw new Error("Forbidden");
        }
        this.messages.set(id, updated);
        this.loader.saveMessage(updated);
    }

    getMessage(id: string): Message | undefined {
        return this.messages.get(id);
    }

    getThread(id: string): Thread | undefined {
        return this.threads.get(id);
    }
}
