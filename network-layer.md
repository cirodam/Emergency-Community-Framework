# Network Layer

## Purpose

The network layer is the foundation of the Fabric Protocol. It handles peer discovery, node identity, transport, and cryptographic request verification. It has no knowledge of governance, banking, or any other domain — it only knows how to find nodes and verify that messages are who they claim to be from.

All node types — community, federation, infrastructure, forum — speak the same network protocol. Node type is metadata; it does not change how the network layer behaves.

---

## Node Identity

Every node has a stable identity record generated on first boot and never changed:

```ts
interface NodeIdentity {
  id: string;          // UUID, generated once, never changes
  type: NodeType;      // "community" | "federation" | "infrastructure" | "forum"
  name: string;        // Human-readable, e.g. "Maplewood Commons"
  address: string;     // Public base URL, e.g. "https://maplewood.example.org"
  publicKey: string;   // Hex-encoded SPKI DER Ed25519 public key
  createdAt: Date;
}
```

The public key is shared openly and included in all peer announcements. The private key never leaves the node's disk.

---

## Ownership Certificates

Every node that participates in the network must be associated with an owner — a community or federation heart node. Nodes without a valid ownership certificate are not admitted to the peer registry and are not gossiped to other peers.

An ownership certificate is a signed document issued by a heart node:

```ts
interface OwnershipCertificate {
  nodeId: string;           // The node being credentialed
  nodePublicKey: string;    // That node's public key
  ownerNodeId: string;      // The heart node issuing the certificate
  ownerPublicKey: string;   // The heart node's public key
  issuedAt: Date;
  expiresAt: Date;          // Certificates expire; heart node must periodically reissue
  signature: string;        // Ed25519 signature over the above fields, signed by owner private key
}
```

**Verification is offline.** Once a peer's heart node public key is known and cached, any certificate that node issues can be verified locally without the heart node being online. The heart node is an authority at issuance time, not a runtime dependency.

**Certificate expiry** is the revocation mechanism. Certificates have a finite lifetime. If a node's certificate is not renewed (because the owning community has dissolved, revoked it, or the heart node is unreachable), the certificate expires and the node falls out of the trusted set.

---

## Heart Nodes

Every community, federation, infrastructure node, and forum has exactly one heart node. The heart node's public key is the root of trust for that entity on the network.

- **Community heart node** — the governance container. Its key is the community's identity.
- **Federation heart node** — the federation's governance node. Its key is the federation's identity.
- **Infrastructure heart node** — the governing node of a shared infrastructure service (hospital, university, power cooperative, etc.). Governed by its affiliated communities.
- **Forum heart node** — the owning node of a hosted topic space. Its key is the forum's identity.

The heart node issues ownership certificates to all subsidiary nodes (bank container, messaging container, etc.) in its constellation. Those subsidiary nodes carry their certificates and present them during peer announcements.

**If the heart node goes down**, subsidiary nodes continue operating. Their certificates remain valid until expiry. Other peers verify certificates against the cached heart node public key — no live connection to the heart node is required.

---

## Peer Registry

Each node maintains its own local peer registry. There is no global peer list — the network is discovered entirely through gossip.

```ts
interface PeerRecord {
  id: string;
  type: NodeType;
  name: string;
  address: string;
  publicKey: string;
  ownershipCertificate: OwnershipCertificate;
  firstSeenAt: Date;
  lastSeenAt: Date;
  lastLatencyMs: number | null;
  consecutiveFailures: number;
  healthy: boolean;
}
```

**Admission rules:**
- Peer must present a valid ownership certificate on announce
- Certificate signature must verify against the claimed owner's public key
- Owner's public key must be known (from registry) or transitively trusted via a shared federation
- Peers without a valid certificate are rejected and not stored

**Eviction rules:**
- Registry is capped (default 10,000 peers)
- Peers unhealthy for > 30 days are eligible for eviction
- Healthy, recently-seen peers are never evicted
- When cap is hit, oldest unhealthy peers are evicted first

---

## Transport

Two transports serve different purposes:

### UDP Gossip — peer discovery and health checking

- Lightweight liveness checks and peer exchange
- Membership updates piggybacked onto health messages
- Protocol: SWIM (used by Consul, Cassandra, Kubernetes)
- No connection setup overhead; one datagram per ping

### HTTPS — structured cross-node actions

Used for intentional operations: transfers, announcements, governance proposals. Required properties for any financial cross-node action:

- **Idempotency key** — client-generated UUID on every request; receiver deduplicates. Prevents double-spend on retry.
- **Two-phase commit** — `POST /transfers/prepare` reserves the debit; `POST /transfers/commit` finalizes. Uncommitted prepares roll back after timeout.
- **Ed25519 request signing** — every request body signed with the sender's private key via `x-node-signature` header. Receiver verifies before processing.

---

## Protocol Endpoints

All nodes expose these endpoints regardless of type:

```
GET  /node/identity    — return this node's NodeIdentity + certificate
GET  /node/peers       — return a random sample of known healthy peers
POST /node/ping        — health check; body: { fromId, fromAddress }
POST /node/announce    — peer introduces itself; body: NodeIdentity + certificate
```

`GET /node/peers` returns a bounded random sample (default 50) rather than the full registry to keep response size bounded and distribute graph knowledge probabilistically.

---

## Peer Discovery Flow

1. **Bootstrap** — new node is given one or more seed addresses at startup
2. **Announce** — new node POSTs its identity and certificate to each seed
3. **Crawl** — node fetches `/node/peers` from each seed, announces itself to those peers, repeats for 2–3 hops
4. **Steady state** — node pings known peers on a schedule (default every 5 minutes), marking unresponsive ones unhealthy after 3 consecutive failures

---

## First Contact Between Communities

When Community B receives a message from a node claiming to belong to Community A, and Community B has never seen Community A before:

1. The announcing node presents its ownership certificate, which includes Community A's heart node public key
2. Community B checks whether it knows Community A's heart node (via registry or shared federation)
3. If a shared federation exists, the federation heart node is the transitive trust anchor — "I know these communities, here are their heart node keys"
4. If no shared context exists, the message is held unverified until Community A's heart node is directly contacted

---

## File Layout

```
src/network/
  NodeIdentity.ts          — NodeIdentity interface, NodeType union, NodeConfig
  NodeSigner.ts            — Ed25519 keypair generation, signing, verification
  PeerRecord.ts            — PeerRecord interface
  PeerRegistry.ts          — In-memory registry with cap and eviction
  PeerRegistryLoader.ts    — Disk persistence for peer registry
  NodeService.ts           — Owns identity, manages registry, runs discovery
  NetworkController.ts     — Express handlers for protocol endpoints
  networkRoutes.ts         — Router mounting
  signatureMiddleware.ts   — Express middleware for Ed25519 request verification
```
