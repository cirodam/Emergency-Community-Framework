import { randomUUID } from "crypto";

// ── Layer types ────────────────────────────────────────────────────────────────

export type MessageLayer = "network" | "governance" | "mail" | "bank" | "market";

/**
 * Delivery semantics for a message type.
 *
 * "sync"  — the sender awaits a meaningful result. Used for bank operations,
 *           network pings. The handler's return value is sent back in the ack.
 *
 * "async" — the recipient immediately acks with status "queued" and processes
 *           in the background. Used for governance broadcasts, mail delivery.
 */
export type MessageSemantics = "sync" | "async";

// ── Core envelope ─────────────────────────────────────────────────────────────

export interface EcfMessage<TBody = unknown> {
    /** UUID — used for idempotency / deduplication. */
    id:     string;
    /** Routing layer. */
    layer:  MessageLayer;
    /**
     * Layer-scoped message type.
     * Convention: "<layer>.<noun>.<verb>", e.g. "bank.transfer.route",
     * "governance.census.submit", "mail.thread.new".
     */
    type:   string;
    /** Canonical URL of the sending node. */
    from:   string;
    /** Canonical URL of the intended recipient. */
    to:     string;
    /** Layer-specific payload. */
    body:   TBody;
    /** ISO 8601 send timestamp. */
    sentAt: string;
}

// ── Acknowledgement ───────────────────────────────────────────────────────────

export interface EcfMessageAck<TResult = unknown> {
    /** Echoes the message id. */
    id:      string;
    /** "ok" = processed synchronously, "queued" = accepted for async processing. */
    status:  "ok" | "queued" | "rejected";
    /** Present when status === "ok" and the handler returned a result. */
    result?: TResult;
    /** Present when status === "rejected". */
    error?:  string;
}

// ── Builder helper ────────────────────────────────────────────────────────────

/**
 * Constructs a fully-formed EcfMessage, filling in id and sentAt automatically.
 */
export function buildMessage<TBody>(
    layer:  MessageLayer,
    type:   string,
    from:   string,
    to:     string,
    body:   TBody,
): EcfMessage<TBody> {
    return {
        id:     randomUUID(),
        layer,
        type,
        from,
        to,
        body,
        sentAt: new Date().toISOString(),
    };
}

// ── Type guard ────────────────────────────────────────────────────────────────

export function isEcfMessage(value: unknown): value is EcfMessage {
    if (typeof value !== "object" || value === null) return false;
    const m = value as Record<string, unknown>;
    return (
        typeof m.id     === "string" &&
        typeof m.layer  === "string" &&
        typeof m.type   === "string" &&
        typeof m.from   === "string" &&
        typeof m.to     === "string" &&
        typeof m.sentAt === "string" &&
        "body" in m
    );
}
