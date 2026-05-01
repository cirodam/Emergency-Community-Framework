import { MailDb } from "./MailDb.js";
import { Message } from "./Message.js";
import { MessageReceipt } from "./MessageReceipt.js";
import { MessageReport } from "./MessageReport.js";
import { Thread } from "./Thread.js";

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
}
