import { FileStore } from "@ecf/core";
import { Message } from "./Message.js";
import { Thread } from "./Thread.js";

export class MessageLoader {
    private readonly messages: FileStore;
    private readonly threads: FileStore;

    constructor(dataDir: string) {
        this.messages = new FileStore(`${dataDir}/messages`);
        this.threads  = new FileStore(`${dataDir}/threads`);
    }

    // ── Messages ───────────────────────────────────────────────────────────

    saveMessage(msg: Message): void {
        this.messages.write(msg.id, msg);
    }

    loadMessage(id: string): Message | undefined {
        return this.messages.read<Message>(id);
    }

    loadAllMessages(): Message[] {
        return this.messages.readAll<Message>();
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
}
