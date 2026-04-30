import { FileStore } from "@ecf/core";
import { Message } from "./Message.js";
import { MessageReceipt } from "./MessageReceipt.js";
import { MessageReport } from "./MessageReport.js";
import { Thread } from "./Thread.js";

export class MessageLoader {
    private readonly messages: FileStore;
    private readonly threads:  FileStore;
    private readonly receipts: FileStore;
    private readonly reports:  FileStore;

    constructor(dataDir: string) {
        this.messages = new FileStore(`${dataDir}/messages`);
        this.threads  = new FileStore(`${dataDir}/threads`);
        this.receipts = new FileStore(`${dataDir}/receipts`);
        this.reports  = new FileStore(`${dataDir}/reports`);
    }

    // ── Messages ───────────────────────────────────────────────────────────

    saveMessage(msg: Message): void {
        this.messages.write(msg.id, msg);
    }

    deleteMessage(id: string): void {
        this.messages.delete(id);
    }

    loadMessage(id: string): Message | undefined {
        return this.messages.read<Message>(id);
    }

    loadAllMessages(): Message[] {
        return this.messages.readAll<Message>();
    }

    // ── Receipts ───────────────────────────────────────────────────────────

    saveReceipt(receipt: MessageReceipt): void {
        this.receipts.write(receipt.id, receipt);
    }

    loadAllReceipts(): MessageReceipt[] {
        return this.receipts.readAll<MessageReceipt>();
    }

    // ── Threads ────────────────────────────────────────────────────────────

    saveThread(thread: Thread): void {
        this.threads.write(thread.id, thread);
    }

    loadThread(id: string): Thread | undefined {
        return this.threads.read<Thread>(id);
    }

    loadAllThreads(): Thread[] {
        return this.threads.readAll<Thread>();
    }

    // ── Reports ────────────────────────────────────────────────────────────

    saveReport(report: MessageReport): void {
        this.reports.write(report.id, report);
    }

    loadAllReports(): MessageReport[] {
        return this.reports.readAll<MessageReport>();
    }
}
