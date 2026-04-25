# High-Level Architecture

## Overview

The Fabric Protocol is structured as a layered system. Each layer derives legitimacy and operational scope from the layer beneath it. Authority flows downward; communication can bypass layers at runtime for performance.

---

## Layer Model

```
┌─────────────────────┬─────────────────────┐
│   Banking Layer     │   Messaging Layer    │
│                     │                      │
│  Local bank (kin)   │  Point-to-point      │
│  Central bank       │  Public posts        │
│  Demurrage/payroll  │                      │
│  Kithe settlement   │                      │
└──────────┬──────────┴──────────┬───────────┘
           │                     │
┌──────────┴─────────────────────┴───────────┐
│              Governance Layer               │
│                                             │
│  Constitutes and owns all operational       │
│  services. Sets rules, policy parameters,   │
│  and mandates under which lower services    │
│  operate. Referenda, councils, elections,   │
│  sortition, domains.                        │
└─────────────────────────────────────────────┘
┌─────────────────────────────────────────────┐
│               Network Layer                 │
│                                             │
│  Peer discovery, node identity, request     │
│  signing, gossip, transport. Foundation     │
│  for all inter-node communication.          │
└─────────────────────────────────────────────┘
```

---

## Layer Responsibilities

### Network Layer

The foundation. All nodes — community, federation, infrastructure — speak the same network protocol.

- Node identity (stable UUID, public key)
- Peer registry and gossip-based discovery
- Request signing and signature verification
- Transport (UDP gossip for health/discovery, HTTP for structured messages)

No business logic lives here. The network layer does not know what a kin or a referendum is.

### Governance Layer

Governance constitutes the operational services above it. A bank cannot exist without an owner — every bank belongs to a community or federation, established by that body's governance.

- Referenda, elections, qualified sortition
- Councils and domains (Food, Healthcare, Housing, etc.)
- Policy outputs: demurrage rate, endowment size, levy formulas, access rules
- Member identity, trust, guardianship

Governance is relatively low-volume. Decisions are made infrequently compared to the operational traffic they authorize.

### Banking Layer

A high-performance execution engine operating under governance mandate. The bank does not make policy — it executes the policy governance has set.

- Processes transactions continuously without re-consulting governance per operation
- Enforces rules it did not write (received from governance as signed policy updates)
- Cannot redefine its own mandate
- If the owning community dissolves, the bank dissolves with it

### Messaging Layer

Sits beside banking as a co-equal operational service, also owned by governance.

- Point-to-point member messaging
- Public posts and community announcements
- Governed by community rules (retention, moderation, access)

Like banking, messaging runs at high volume relative to governance events and communicates directly with the network layer for transport.

---

## Two-Tier Banking Model

Banking operates at two scales, mirroring the two-tier structure of the network:

### Community Bank (per community node)

- Manages individual member accounts in **kin** (the community's internal currency)
- Runs monetary policy: demurrage, endowments, social insurance payroll
- Handles all intra-community transactions
- Does not handle inter-community settlement

### Federation Bank (per federation node)

- Manages institutional accounts for affiliated community nodes in **kithe** (the network currency)
- Handles inter-community clearing and settlement
- Does not have individual member accounts
- Governed by the federation council (affiliated communities vote by contribution/population)

The dependency is always **local first**: a community node's governance and marketplace talk to their own local bank. The federation bank only enters the picture for cross-community flows.

This structure is analogous to the credit union model:
- Individual credit unions (community nodes) serve members locally
- A corporate credit union (federation node) handles inter-CU settlement and liquidity
- Governance flows from member communities upward to the federation, not the reverse

---

## Authority vs. Communication Path

These are distinct:

| | Authority chain | Runtime communication |
|---|---|---|
| **Direction** | Governance → Bank/Messaging | Bank/Messaging → Network directly |
| **Frequency** | Rare (policy changes) | Continuous (transactions, messages) |
| **Example** | Governance sets demurrage rate | Bank sweeps accounts on schedule |

Governance sets the rules once. Operational layers execute against those rules at full speed without per-operation governance involvement.

---

## Deployment Model (Community Node)

A single community node deployment runs multiple containers:

```
community-node/
  docker-compose.yml
    services:
      network      # Peer registry, gossip, identity
      governance   # Referenda, councils, domains, members
      bank         # Bank + CentralBank, internal API
      messaging    # Member messages, posts
      frontend     # Svelte UI
```

Bank and messaging are separated from governance to reflect their different scaling characteristics. Both are owned by governance but handle the bulk of runtime traffic.

### Federation Node

A federation node is a distinct deployment — not a fork of the community node. It has no member accounts and runs a purpose-built kithe clearing service.

```
federation-node/
  docker-compose.yml
    services:
      network        # Same protocol, different node type
      governance     # Federation council governance
      federal-bank   # Kithe clearing and settlement
```

---

## Key Invariants

1. **Every bank has an owner.** A bank cannot bootstrap without knowing its owning community or federation.
2. **Governance produces banking effects; banking does not produce governance effects.** The dependency arrow is one-way.
3. **Intra-community traffic never touches the federation.** Local bank handles all local flows.
4. **Network layer is policy-agnostic.** It routes and verifies; it does not interpret.
5. **Banking and messaging are operationally independent.** A messaging outage does not affect transaction processing and vice versa.
