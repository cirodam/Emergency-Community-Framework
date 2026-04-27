import { randomUUID } from "crypto";
import { Message } from "./Message.js";
import { MessageReceipt } from "./MessageReceipt.js";
import { Thread } from "./Thread.js";
import { MessageLoader } from "./MessageLoader.js";

export class MessageService {
    private static instance: MessageService;
    private loader!: MessageLoader;
    private messages: Map<string, Message>        = new Map();
    private receipts: Map<string, MessageReceipt> = new Map();
    private threads:  Map<string, Thread>          = new Map();

    static getInstance(): MessageService {
        if (!MessageService.instance) MessageService.instance = new MessageService();
        return MessageService.instance;
    }

    init(loader: MessageLoader): void {
        this.loader = loader;

        for (const t of loader.loadAllThreads())  this.threads.set(t.id, t);
        for (const m of loader.loadAllMessages()) this.messages.set(m.id, m);
        for (const r of loader.loadAllReceipts()) this.receipts.set(r.id, r);

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
                toPersonIds:  msg.toPersonIds?.length ? msg.toPersonIds : [legacy.toPersonId],
                subject:      msg.subject,
                body:         msg.body,
                sentAt:       msg.sentAt,
            };
            this.messages.set(msg.id, upgraded);
            loader.saveMessage(upgraded);
        }
    }

    // ── Send ───────────────────────────────────────────────────────────────

    /**
     * Send a message from `fromPersonId` to one or more recipients.
     *
     * If `existingThreadId` is provided the message is appended to that thread
     * (sender must be a participant). Otherwise a new thread is created.
     *
     * Returns the saved message.
     */
    send(
        fromPersonId: string,
        toPersonIds: string[],
        subject: string,
        body: string,
        existingThreadId?: string,
    ): Message {
        if (!toPersonIds.length) throw new Error("At least one recipient is required");
        const uniqueRecipients = [...new Set(toPersonIds.filter(id => id !== fromPersonId))];
        if (!uniqueRecipients.length) throw new Error("Cannot send a message only to yourself");

        const now = new Date().toISOString();

        // Resolve or create thread
        let thread: Thread;
        if (existingThreadId) {
            const existing = this.threads.get(existingThreadId);
            if (!existing) throw new Error("Thread not found");
            if (!existing.participantIds.includes(fromPersonId))
                throw new Error("Forbidden: not a thread participant");
            const allParticipants = [...new Set([...existing.participantIds, fromPersonId, ...uniqueRecipients])];
            thread = { ...existing, participantIds: allParticipants, lastMessageAt: now };
        } else {
            thread = {
                id:             randomUUID(),
                subject:        subject.trim() || "(no subject)",
                participantIds: [...new Set([fromPersonId, ...uniqueRecipients])],
                lastMessageAt:  now,
            };
        }

        const msg: Message = {
            id:           randomUUID(),
            threadId:     thread.id,
            fromPersonId,
            toPersonIds:  uniqueRecipients,
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
}
