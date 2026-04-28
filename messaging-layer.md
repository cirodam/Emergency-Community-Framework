# ECF Messaging Layer — Foundation Plan

## Context

Every cross-node call today is a direct ad-hoc `fetch()` to a hardcoded endpoint.
This works but has no shared auth model, no retry, no audit trail, and no extensibility.
This plan introduces a typed message envelope that all cross-node communication runs through.

---

## Goals

- One `POST /api/message` endpoint at every tier (community, federation, commonwealth, globe)
- A shared envelope type in `@ecf/core` — layer + type + body + routing metadata
- A dispatcher in `@ecf/core` that routes to layer-specific handlers
- Sync and async delivery semantics, chosen per message type
- Only the cluster primary sends outbound messages
- Existing direct calls (route-payment, transfers/out, census) migrate to messages over time

---

## The Envelope

```typescript
// packages/core/src/network/EcfMessage.ts

export type MessageLayer = "network" | "governance" | "mail" | "bank" | "market";

export interface EcfMessage<TBody = unknown> {
    id:      string;          // UUID — used for deduplication
    layer:   MessageLayer;
    type:    string;          // layer-scoped: "bank.route-payment", "governance.vote.cast", etc.
    from:    string;          // sender's canonical URL
    to:      string;          // recipient's canonical URL
    body:    TBody;
    sentAt:  string;          // ISO 8601
}

// What the recipient returns synchronously
export interface EcfMessageAck {
    id:      string;          // echoes message id
    status:  "ok" | "queued" | "rejected";
    error?:  string;
}
```

Signature stays in the HTTP header (`x-node-signature`) as it is today — not in the body.

---

## Layers and Message Types

### `network`
Low-level topology. Mostly already handled by `/api/node/*` but can flow through the envelope.

| type | direction | semantics |
|---|---|---|
| `network.announce` | any → any | peer introduces itself |
| `network.ping` | any → any | health check |
| `network.membership-chain` | community → federation | request upstream URLs |

### `governance`
Constitutional changes, proposals, votes, ratification.

| type | direction | semantics |
|---|---|---|
| `governance.proposal.new` | operator → members | broadcast new proposal |
| `governance.vote.cast` | member → operator | cast a vote |
| `governance.amendment.ratified` | operator → members | broadcast ratified change |
| `governance.census.submit` | community → federation | periodic census |

### `mail`
Person-to-person messages routed through the hierarchy.

| type | direction | semantics |
|---|---|---|
| `mail.thread.new` | community → federation (→ community) | new conversation |
| `mail.message.new` | community → federation (→ community) | reply |
| `mail.thread.delivered` | destination community → origin | delivery ack |

### `bank`
Financial operations. These are currently direct HTTP calls and will migrate here.

| type | direction | semantics |
|---|---|---|
| `bank.transfer.route` | community → federation → ... | replaces current `POST /api/route-payment` |
| `bank.transfer.receive` | federation → community | replaces current `POST /api/transfers/receive` |
| `bank.transfer.out` | person → community | replaces current `POST /api/transfers/out` |

### `market`
Listings, orders, fulfillment — when the market package is further developed.

---

## Dispatcher Architecture

Lives in `@ecf/core/src/network/MessageDispatcher.ts`.

```typescript
type MessageHandler<TBody = unknown> = (
    msg: EcfMessage<TBody>,
    req: Request,
) => Promise<EcfMessageAck>;

class MessageDispatcher {
    private handlers = new Map<string, MessageHandler>();

    // Register a handler for "layer.type" (e.g. "bank.transfer.route")
    register<TBody>(layerAndType: string, handler: MessageHandler<TBody>): void;

    // Called by POST /api/message
    async dispatch(msg: EcfMessage, req: Request): Promise<EcfMessageAck>;
}
```

Each package registers its own handlers at startup:

```typescript
// In federation/src/index.ts
const dispatcher = MessageDispatcher.getInstance();
dispatcher.register("bank.transfer.route", handleRoutePayment);
dispatcher.register("governance.census.submit", handleCensus);
dispatcher.register("governance.vote.cast", handleVote);
```

---

## The Endpoint

Single route added to every tier's router:

```
POST /api/message
Headers: x-node-id, x-node-signature
Body: EcfMessage
Returns: EcfMessageAck
```

Middleware chain:
1. `verifyNodeSignature` — existing signature check
2. Validate envelope shape (id, layer, type, from, to, sentAt all present)
3. Deduplication check — if `id` already processed, return cached ack
4. `dispatcher.dispatch(msg, req)`

---

## Delivery Semantics

Two modes, chosen by message type at registration time:

**Synchronous** — caller awaits a meaningful result before continuing.
Used for: `bank.*`, `network.ping`

**Fire-and-queue** — caller gets `{ status: "queued" }` immediately; recipient processes in background.
Used for: `governance.*`, `mail.*`, `network.announce`

For fire-and-queue, the recipient acknowledges receipt but processes asynchronously. The sender retries if no ack is received within a timeout.

---

## Cluster Behaviour

Before sending any outbound message:

```typescript
if (!ClusterService.getInstance().isPrimary()) return; // replicas don't send
```

Inbound messages are handled by whichever node receives them — replicas redirect to the primary via `replicaWriteGuard` already in place.

---

## Sender Utility

A `sendMessage()` helper in `@ecf/core` wraps fetch + signing:

```typescript
async function sendMessage<TBody>(
    toUrl: string,
    layer: MessageLayer,
    type: string,
    body: TBody,
    signer: NodeSigner,
    nodeId: string,
): Promise<EcfMessageAck>
```

All existing ad-hoc `fetch()` calls to other nodes migrate to this.

---

## Migration Path

The existing direct endpoints (`/api/route-payment`, `/api/transfers/out`, `/api/transfers/receive`, `/api/census`) stay in place during the migration. New messages route through `/api/message`. Once all callers are updated, the old endpoints can be removed.

Priority order:
1. **Phase 1** — Build `EcfMessage`, `MessageDispatcher`, `sendMessage`, `POST /api/message` endpoint in `@ecf/core` ✦ core foundation
2. **Phase 2** — Register governance handlers (census, votes, proposals) — highest value since there's no clean path today
3. **Phase 3** — Register mail handlers — enables cross-community person messaging
4. **Phase 4** — Migrate bank messages — replace direct `route-payment` / `transfers` calls
5. **Phase 5** — Remove legacy direct endpoints

---

## Open Questions

- **Deduplication store** — in-memory (lost on restart) or persisted? For bank messages, persisted is important.
- **Retry policy** — exponential backoff up to N attempts, then dead-letter queue?
- **Dead-letter handling** — failed governance broadcasts should be visible to the operator, not silently dropped.
- **Message size limit** — mail messages with attachments will be large; or does mail use a separate attachment endpoint and just pass a reference ID?
