import type { Request } from "express";
import type { EcfMessage, EcfMessageAck, MessageSemantics } from "./EcfMessage.js";

// ── Handler type ──────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type MessageHandler<TBody = any, TResult = unknown> = (
    msg: EcfMessage<TBody>,
    req: Request,
) => Promise<TResult>;

interface HandlerEntry {
    handler:   MessageHandler;
    semantics: MessageSemantics;
}

// ── MessageDispatcher ─────────────────────────────────────────────────────────

/**
 * Central dispatcher for the ECF message layer.
 *
 * Each package registers handlers at startup:
 *
 *   const dispatcher = MessageDispatcher.getInstance();
 *   dispatcher.register("bank.transfer.route", handleRoutePayment, "sync");
 *   dispatcher.register("governance.census.submit", handleCensus, "async");
 *
 * The POST /api/message endpoint calls dispatcher.dispatch() for every
 * inbound message after signature verification.
 */
export class MessageDispatcher {
    private static _instance: MessageDispatcher | null = null;

    /**
     * Processed message IDs for deduplication.
     * In-memory only — sufficient for Phase 1. Bank messages will need a
     * persisted store before production use.
     */
    private readonly seen = new Map<string, EcfMessageAck>();

    /** Maximum number of acks to keep in the dedup cache before eviction. */
    private readonly maxSeen = 10_000;

    private readonly handlers = new Map<string, HandlerEntry>();

    private constructor() {}

    static getInstance(): MessageDispatcher {
        if (!MessageDispatcher._instance) {
            MessageDispatcher._instance = new MessageDispatcher();
        }
        return MessageDispatcher._instance;
    }

    // ── Registration ──────────────────────────────────────────────────────────

    /**
     * Register a handler for a fully-qualified message type (e.g. "bank.transfer.route").
     *
     * @param type      Fully-qualified message type string.
     * @param handler   Async function that processes the message and returns a result.
     * @param semantics "sync" (default) or "async". Async handlers receive an
     *                  immediate "queued" ack; their result is not returned to the caller.
     */
    register<TBody = unknown, TResult = unknown>(
        type:      string,
        handler:   MessageHandler<TBody, TResult>,
        semantics: MessageSemantics = "sync",
    ): void {
        if (this.handlers.has(type)) {
            console.warn(`[MessageDispatcher] overwriting handler for "${type}"`);
        }
        this.handlers.set(type, { handler: handler as MessageHandler, semantics });
    }

    /** Returns true if a handler is registered for the given type. */
    hasHandler(type: string): boolean {
        return this.handlers.has(type);
    }

    // ── Dispatch ──────────────────────────────────────────────────────────────

    /**
     * Dispatch an inbound message to its registered handler.
     *
     * Deduplication: if the message id has been seen before, the cached ack
     * is returned immediately without re-invoking the handler.
     */
    async dispatch(msg: EcfMessage, req: Request): Promise<EcfMessageAck> {
        // Deduplication
        const cached = this.seen.get(msg.id);
        if (cached) return cached;

        const entry = this.handlers.get(msg.type);
        if (!entry) {
            const ack: EcfMessageAck = {
                id:     msg.id,
                status: "rejected",
                error:  `No handler registered for message type "${msg.type}"`,
            };
            return ack;
        }

        // Async: ack immediately, process in background
        if (entry.semantics === "async") {
            const ack: EcfMessageAck = { id: msg.id, status: "queued" };
            this.cacheAck(msg.id, ack);
            // Fire-and-forget — errors are logged, not surfaced to caller
            void entry.handler(msg, req).catch(err => {
                console.error(
                    `[MessageDispatcher] async handler for "${msg.type}" threw:`,
                    (err as Error).message,
                );
            });
            return ack;
        }

        // Sync: await result, return to caller
        try {
            const result = await entry.handler(msg, req);
            const ack: EcfMessageAck = { id: msg.id, status: "ok", result };
            this.cacheAck(msg.id, ack);
            return ack;
        } catch (err) {
            // Don't cache failures — allow retry
            return {
                id:     msg.id,
                status: "rejected",
                error:  (err as Error).message ?? "Handler threw an unknown error",
            };
        }
    }

    // ── Internal ──────────────────────────────────────────────────────────────

    private cacheAck(id: string, ack: EcfMessageAck): void {
        if (this.seen.size >= this.maxSeen) {
            // Evict oldest entry (Map preserves insertion order)
            const firstKey = this.seen.keys().next().value;
            if (firstKey !== undefined) this.seen.delete(firstKey);
        }
        this.seen.set(id, ack);
    }
}
