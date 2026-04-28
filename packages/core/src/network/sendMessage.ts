import type { NodeSigner } from "./NodeSigner.js";
import { buildMessage, type EcfMessage, type EcfMessageAck, type MessageLayer } from "./EcfMessage.js";

// ── sendMessage ────────────────────────────────────────────────────────────────

/**
 * Send a typed message to another ECF node.
 *
 * Signs the serialised EcfMessage with the caller's Ed25519 key and POSTs it
 * to `{toUrl}/api/message`. Throws on network failure or a non-2xx response.
 *
 * Usage:
 *   const ack = await sendMessage(
 *     federationUrl, "governance", "governance.census.submit",
 *     { memberCount, nullifiers },
 *     node.getSigner(), node.getIdentity().id,
 *     node.getIdentity().address,
 *   );
 */
export async function sendMessage<TBody = unknown, TResult = unknown>(
    toUrl:   string,
    layer:   MessageLayer,
    type:    string,
    body:    TBody,
    signer:  NodeSigner,
    nodeId:  string,
    fromUrl: string,
): Promise<EcfMessageAck<TResult>> {
    const msg = buildMessage<TBody>(layer, type, fromUrl, toUrl.replace(/\/$/, ""), body);
    return postMessage<TResult>(toUrl, msg, signer, nodeId);
}

/**
 * Send a pre-built EcfMessage to another ECF node.
 *
 * Useful when the caller needs to capture the message id before sending
 * (e.g. to store it for retry tracking).
 */
export async function postMessage<TResult = unknown>(
    toUrl:   string,
    msg:     EcfMessage,
    signer:  NodeSigner,
    nodeId:  string,
): Promise<EcfMessageAck<TResult>> {
    const base    = toUrl.replace(/\/$/, "");
    const payload = JSON.stringify(msg);
    const sig     = signer.signBody(payload);

    const res = await fetch(`${base}/api/message`, {
        method:  "POST",
        headers: {
            "Content-Type":     "application/json",
            "x-node-id":        nodeId,
            "x-node-signature": sig,
        },
        body: payload,
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(
            `[sendMessage] ${type(msg)} to ${base} failed (${res.status}): ${err.error ?? "unknown"}`,
        );
    }

    return res.json() as Promise<EcfMessageAck<TResult>>;
}

function type(msg: EcfMessage): string {
    return `${msg.layer}/${msg.type}`;
}
