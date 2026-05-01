import { MailDb } from "./MailDb.js";
import { Message } from "./Message.js";
import { MessageReceipt } from "./MessageReceipt.js";
import { MessageReport } from "./MessageReport.js";
import { Thread } from "./Thread.js";
import { Draft } from "./Draft.js";

export class MessageLoader {
    private get db() { return MailDb.getInstance().db; }

    // ── Messages ───────────────────────────────────────────────────────────

    saveMessage(msg: Message): void {
        this.db.prepare(`
            INSERT INTO messages (id, data) VALUES (?, ?)
            ON CONFLICT(id) DO UPDATE SET data = excluded.data
        `).run(msg.id, JSON.stringify(msg));
    }

    deleteMessage(id: string): void {
        this.db.prepare(`DELETE FROM messages WHERE id = ?`).run(id);
    }

    loadMessage(id: string): Message | undefined {
        const row = this.db.prepare(`SELECT data FROM messages WHERE id = ?`).get(id) as { data: string } | undefined;
        return row ? JSON.parse(row.data) as Message : undefined;
    }

    loadAllMessages(): Message[] {
        const rows = this.db.prepare(`SELECT data FROM messages`).all() as { data: string }[];
        return rows.map(r => JSON.parse(r.data) as Message);
    }

    // ── Receipts ───────────────────────────────────────────────────────────

    saveReceipt(receipt: MessageReceipt): void {
        this.db.prepare(`
            INSERT INTO receipts (id, data) VALUES (?, ?)
            ON CONFLICT(id) DO UPDATE SET data = excluded.data
        `).run(receipt.id, JSON.stringify(receipt));
    }

    deleteReceipt(id: string): void {
        this.db.prepare(`DELETE FROM receipts WHERE id = ?`).run(id);
    }

    deleteReceiptsForPerson(personId: string, onlyDeleted: boolean): void {
        const rows = this.db.prepare(`SELECT id, data FROM receipts`).all() as { id: string; data: string }[];
        const toDelete = rows
            .map(r => ({ id: r.id, receipt: JSON.parse(r.data) as MessageReceipt }))
            .filter(({ receipt }) =>
                receipt.personId === personId && (!onlyDeleted || receipt.deleted),
            );
        const del = this.db.prepare(`DELETE FROM receipts WHERE id = ?`);
        const tx = this.db.transaction(() => {
            for (const { id } of toDelete) del.run(id);
        });
        tx();
    }

    loadAllReceipts(): MessageReceipt[] {
        const rows = this.db.prepare(`SELECT data FROM receipts`).all() as { data: string }[];
        return rows.map(r => JSON.parse(r.data) as MessageReceipt);
    }

    // ── Threads ────────────────────────────────────────────────────────────

    saveThread(thread: Thread): void {
        this.db.prepare(`
            INSERT INTO threads (id, data) VALUES (?, ?)
            ON CONFLICT(id) DO UPDATE SET data = excluded.data
        `).run(thread.id, JSON.stringify(thread));
    }

    loadThread(id: string): Thread | undefined {
        const row = this.db.prepare(`SELECT data FROM threads WHERE id = ?`).get(id) as { data: string } | undefined;
        return row ? JSON.parse(row.data) as Thread : undefined;
    }

    loadAllThreads(): Thread[] {
        const rows = this.db.prepare(`SELECT data FROM threads`).all() as { data: string }[];
        return rows.map(r => JSON.parse(r.data) as Thread);
    }

    // ── Reports ────────────────────────────────────────────────────────────

    saveReport(report: MessageReport): void {
        this.db.prepare(`
            INSERT INTO reports (id, data) VALUES (?, ?)
            ON CONFLICT(id) DO UPDATE SET data = excluded.data
        `).run(report.id, JSON.stringify(report));
    }

    loadAllReports(): MessageReport[] {
        const rows = this.db.prepare(`SELECT data FROM reports`).all() as { data: string }[];
        return rows.map(r => JSON.parse(r.data) as MessageReport);
    }

    // ── Drafts ────────────────────────────────────────────────────────────────

    saveDraft(draft: Draft): void {
        this.db.prepare(`
            INSERT INTO drafts (id, person_id, data, updated_at) VALUES (?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at
        `).run(draft.id, draft.personId, JSON.stringify(draft), draft.updatedAt);
    }

    deleteDraft(id: string): void {
        this.db.prepare(`DELETE FROM drafts WHERE id = ?`).run(id);
    }

    loadDraft(id: string): Draft | undefined {
        const row = this.db.prepare(`SELECT data FROM drafts WHERE id = ?`).get(id) as { data: string } | undefined;
        return row ? JSON.parse(row.data) as Draft : undefined;
    }

    loadDraftsForPerson(personId: string): Draft[] {
        const rows = this.db.prepare(`SELECT data FROM drafts WHERE person_id = ? ORDER BY updated_at DESC`).all(personId) as { data: string }[];
        return rows.map(r => JSON.parse(r.data) as Draft);
    }

    // ── Thread states (archive) ────────────────────────────────────────────

    setThreadArchived(threadId: string, personId: string, archived: boolean): void {
        this.db.prepare(`
            INSERT INTO thread_states (thread_id, person_id, archived) VALUES (?, ?, ?)
            ON CONFLICT(thread_id, person_id) DO UPDATE SET archived = excluded.archived
        `).run(threadId, personId, archived ? 1 : 0);
    }

    loadArchivedThreadIds(personId: string): Set<string> {
        const rows = this.db.prepare(
            `SELECT thread_id FROM thread_states WHERE person_id = ? AND archived = 1`
        ).all(personId) as { thread_id: string }[];
        return new Set(rows.map(r => r.thread_id));
    }

    // ── Search ────────────────────────────────────────────────────────────────

    /** Returns message IDs matching the FTS query, scoped to threads the person participates in. */
    searchMessageIds(query: string): string[] {
        const rows = this.db.prepare(
            `SELECT id FROM messages_fts WHERE messages_fts MATCH ? ORDER BY rank`
        ).all(query) as { id: string }[];
        return rows.map(r => r.id);
    }
}
