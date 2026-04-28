import { type Request, type Response } from "express";
import { NodeService, sendMessage, type EcfMessage } from "@ecf/core";
import { FederationMembershipService } from "../FederationMembershipService.js";
import { PersonService } from "../person/PersonService.js";

const MAIL_URL = process.env.MAIL_URL ?? process.env.PUBLIC_MAIL_URL ?? "http://localhost:3020";

// ── Shared types ──────────────────────────────────────────────────────────────

/**
 * Body of a "mail.message.deliver" EcfMessage.
 *
 * All fields are handles / IDs portable across community boundaries.
 * `fromHandle` is formatted as "handle@communityHandle" for display.
 * `toHandles`  are handles local to the destination community (no "@" needed
 *  since this message is already addressed to a single community).
 */
export interface MailDeliverBody {
    /** Stable ID for deduplication (matches the sender's local message ID). */
    messageId:   string;
    /** Stable thread ID — if a thread with this id already exists on the
     *  destination, the message is appended to it. */
    threadId:    string;
    subject:     string;
    /** "bob@src-community" — display only, not resolved locally. */
    fromHandle:  string;
    /** Local handles at the destination community (e.g. ["alice", "carol"]). */
    toHandles:   string[];
    body:        string;
    sentAt:      string; // ISO 8601
}

// ── Outbound relay ────────────────────────────────────────────────────────────

/**
 * POST /api/mail/route-external
 * Called by the local mail service when a message is addressed to a person
 * in another community.
 *
 * Body: {
 *   toCommunityHandle: string,  — handle of the destination community
 *   toHandles: string[],        — local handles at the destination
 *   fromHandle: string,         — "handle@this-community-handle"
 *   messageId: string,
 *   threadId: string,
 *   subject: string,
 *   body: string,
 *   sentAt: string,
 * }
 *
 * No person auth — this is an internal call from the local mail service.
 * Rate-limiting / abuse prevention is a future concern.
 */
export async function routeExternalMail(req: Request, res: Response): Promise<void> {
    const { toCommunityHandle, toHandles, fromHandle, messageId, threadId, subject, body, sentAt } = req.body ?? {};

    if (typeof toCommunityHandle !== "string" || !toCommunityHandle) {
        res.status(400).json({ error: "toCommunityHandle is required" }); return;
    }
    if (!Array.isArray(toHandles) || !toHandles.length || toHandles.some((h: unknown) => typeof h !== "string")) {
        res.status(400).json({ error: "toHandles must be a non-empty array of strings" }); return;
    }
    if (typeof fromHandle !== "string" || !fromHandle) {
        res.status(400).json({ error: "fromHandle is required" }); return;
    }
    if (typeof messageId !== "string" || !messageId) {
        res.status(400).json({ error: "messageId is required" }); return;
    }
    if (typeof threadId !== "string" || !threadId) {
        res.status(400).json({ error: "threadId is required" }); return;
    }
    if (typeof body !== "string" || !body.trim()) {
        res.status(400).json({ error: "body is required" }); return;
    }

    // Resolve target community URL via federation
    const fedSvc = FederationMembershipService.getInstance();
    const record = fedSvc.getStatus();
    if (!record || record.status !== "approved") {
        res.status(503).json({ error: "Community is not an approved federation member — cannot route external mail" }); return;
    }

    // Fetch members from federation to find the target community's URL
    let targetUrl: string | null = null;
    try {
        const fedBase = record.federationUrl.replace(/\/$/, "");
        const membersRes = await fetch(`${fedBase}/api/members`);
        if (membersRes.ok) {
            const members = await membersRes.json() as { handle: string; url: string }[];
            const match = members.find(m => m.handle === toCommunityHandle);
            if (match?.url) targetUrl = match.url;
        }
    } catch (err) {
        console.warn(`[mail-relay] could not fetch federation members: ${(err as Error).message}`);
    }

    if (!targetUrl) {
        res.status(404).json({ error: `Community "${toCommunityHandle}" not found in federation` }); return;
    }

    const node = NodeService.getInstance();
    const mailBody: MailDeliverBody = {
        messageId,
        threadId,
        subject:    typeof subject === "string" ? subject : "(no subject)",
        fromHandle,
        toHandles,
        body,
        sentAt:     typeof sentAt === "string" ? sentAt : new Date().toISOString(),
    };

    try {
        await sendMessage<MailDeliverBody>(
            targetUrl,
            "mail",
            "mail.message.deliver",
            mailBody,
            node.getSigner(),
            node.getIdentity().id,
            node.getIdentity().address,
        );
    } catch (err) {
        console.warn(`[mail-relay] delivery to ${toCommunityHandle} failed: ${(err as Error).message}`);
        res.status(502).json({ error: `Could not deliver to community "${toCommunityHandle}": ${(err as Error).message}` });
        return;
    }

    res.json({ ok: true, delivered: toCommunityHandle });
}

// ── Inbound handler ───────────────────────────────────────────────────────────

/**
 * MessageDispatcher handler for "mail.message.deliver".
 *
 * Resolves each toHandle to a local person, then POSTs the message
 * to the local mail service's /api/messages/incoming endpoint.
 */
export async function handleInboundMail(
    msg: EcfMessage<MailDeliverBody>,
): Promise<{ stored: string[] }> {
    const { messageId, threadId, subject, fromHandle, toHandles, body, sentAt } = msg.body ?? {};

    if (typeof messageId !== "string" || !messageId) throw new Error("messageId is required");
    if (typeof threadId  !== "string" || !threadId)  throw new Error("threadId is required");
    if (!Array.isArray(toHandles) || !toHandles.length) throw new Error("toHandles is required");

    // Resolve handles to person IDs
    const personSvc = PersonService.getInstance();
    const resolvedIds: string[] = [];
    for (const handle of toHandles) {
        const person = personSvc.getByHandle(handle);
        if (person) resolvedIds.push(person.id);
        else console.warn(`[mail-relay] inbound: unknown handle "${handle}" — skipping`);
    }

    if (!resolvedIds.length) {
        throw new Error(`None of the recipient handles could be resolved: ${toHandles.join(", ")}`);
    }

    // Forward to local mail service
    const mailBase = MAIL_URL.replace(/\/$/, "");
    const payload = JSON.stringify({
        messageId,
        threadId,
        subject:  subject ?? "(no subject)",
        fromHandle,
        toPersonIds: resolvedIds,
        body,
        sentAt,
    });

    const node = NodeService.getInstance();
    const res = await fetch(`${mailBase}/api/messages/incoming`, {
        method:  "POST",
        headers: {
            "Content-Type":     "application/json",
            "x-node-id":        node.getIdentity().id,
            "x-node-signature": node.getSigner().signBody(payload),
        },
        body: payload,
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(`Mail service rejected inbound message: ${err.error ?? res.status}`);
    }

    return { stored: resolvedIds };
}
