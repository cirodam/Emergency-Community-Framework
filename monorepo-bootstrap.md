# Fabric Protocol — New Project Bootstrap

## What This Is

The Fabric Protocol is a distributed network of community and federation nodes that together form a cooperative economic and governance infrastructure. This document describes the core architecture and how to bootstrap the monorepo from scratch.

The `LocalCommunity` project is the working prototype this design was derived from. The new project implements the same ideas with a clean separation of concerns and a proper multi-container architecture.

---

## Core Concepts

### Layers

```
┌─────────────────────┬─────────────────────┐
│   Banking Layer     │   Messaging Layer    │
│  (value ledger,     │  (point-to-point,    │
│   pure infra)       │   public posts)      │
└──────────┬──────────┴──────────┬───────────┘
┌──────────┴─────────────────────┴───────────┐
│              Governance Layer               │
│  Constitutes and owns all operational       │
│  services. Heart node = community identity. │
└─────────────────────────────────────────────┘
┌─────────────────────────────────────────────┐
│               Network Layer                 │
│  Peer discovery, identity, signatures,      │
│  transport. Policy-agnostic.                │
└─────────────────────────────────────────────┘
```

### Node Types

| Type | Purpose |
|---|---|
| `community` | Where people live. Members, governance, local bank (kin). |
| `federation` | Inter-community clearing. Kithe settlement, federation governance. |
| `infrastructure` | Shared services (hospital, university, power). Governed by affiliated communities. |
| `forum` | Hosted topic space for cross-network interest groups. |

All four types speak the same network protocol.

### Heart Nodes

Every community, federation, infrastructure node, and forum has exactly one heart node. The heart node's Ed25519 public key is that entity's root of trust on the network.

- Issues ownership certificates to all subsidiary nodes (bank, messaging, etc.)
- Subsidiary nodes operate independently once credentialed — the heart node does not need to be online for them to function
- Certificates expire; the heart node must periodically reissue them

### Currencies

- **kin** — a community's internal currency. Issued by the community's central bank. Subject to demurrage.
- **kithe** — the network settlement currency. Used for inter-community transfers and federation levies.
- kin and kithe are always 1:1. The currency board mints/burns kin against kithe reserves.

### The Bank Is Infrastructure

The bank is a generic value ledger. It has no opinion about who its account holders are — members, communities, scheduled processes all look the same. It moves value between accounts, records transactions, and enforces overdraft limits.

Policy (demurrage, endowments, mint/burn) lives in external processes that hold authorized accounts at the bank. The same bank codebase runs as a community bank (kin) and a federal bank (kithe).

### Authorization Model

- **Node-to-node**: Ed25519 keypairs. Every request signed with `x-node-signature`. Verified against sender's public key from peer registry.
- **Member-to-bank**: Members have their own keypairs registered at the bank. Direct authentication for day-to-day transactions.
- **SMS members**: PIN-based authentication via a trusted SMS gateway node. Subject to governance-set transaction limits.
- **Account creation**: Bank coordinates with community node to verify member entitlement before opening an account.

---

## Container Architecture

### Community Node Deployment

```
community-container   — governance, members, referenda, central bank, currency board, SMS gateway
bank-container        — kin accounts, transactions, two-phase commit
frontend              — Svelte UI
```

### Federation Node Deployment

```
federation-container  — federation governance, affiliated community registry, levy management
bank-container        — kithe accounts, inter-community settlement
```

The bank container is the **same image** in both deployments. Currency type and authorized callers are configuration, not code.

---

## Monorepo Structure

```
fabric/
  package.json              ← npm workspaces root
  tsconfig.base.json        ← shared TypeScript config

  packages/

    core/                   ← @fabric/core
      src/
        network/            ← NodeIdentity, NodeSigner, PeerRegistry, NodeService
        storage/            ← FileStore, generic persistence primitives
        http/               ← base Express server, signature middleware
        types/              ← shared interfaces (IEconomicActor, etc.)
        auth/               ← Ed25519 keypairs, ownership certificates

    bank/                   ← @fabric/bank
      src/
        Bank.ts             ← core ledger
        BankAccount.ts
        BankTransaction.ts
        AccountLoader.ts
        TransactionLoader.ts
        routes/             ← HTTP API
      Dockerfile

    community/              ← @fabric/community
      src/
        member/
        referendum/
        central_bank/       ← demurrage, endowments (calls bank over HTTP)
        commons/
        domains/
        marketplace/        ← calls bank over HTTP
        sms/
        settings/
        calendar/
        scheduler/
        social_insurance/
        routes/
      Dockerfile

    federation/             ← @fabric/federation
      src/
        governance/         ← federation referenda, affiliated community registry
        levy/
        routes/
      Dockerfile

    frontend/               ← Svelte UI (HTTP client only, no internal imports)
      Dockerfile
```

### Dependency Rules

| Package | May import |
|---|---|
| `core` | nothing internal |
| `bank` | `core` only |
| `community` | `core` only — calls `bank` over HTTP |
| `federation` | `core` only — calls `bank` over HTTP |
| `frontend` | nothing internal — HTTP only |

**If `community` ever imports from `@fabric/bank` directly, that is a bug.** All bank interactions are network calls.

---

## Bootstrapping Steps

### 1. Initialize the repo

```bash
git init
npm init -y
```

### 2. Configure npm workspaces

Edit root `package.json`:

```json
{
  "name": "Emergency Community Framework",
  "private": true,
  "workspaces": [
    "packages/core",
    "packages/bank",
    "packages/community",
    "packages/federation",
    "packages/frontend"
  ]
}
```

### 3. Create shared TypeScript config

`tsconfig.base.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "types": ["node"]
  }
}
```

### 4. Create each package

Each package gets its own `package.json` and `tsconfig.json`. Example for `core`:

```bash
mkdir -p packages/core/src
```

`packages/core/package.json`:
```json
{
  "name": "@ecf/core",
  "version": "0.1.0",
  "type": "module",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc"
  },
  "devDependencies": {
    "typescript": "^6.0.0",
    "@types/node": "^25.0.0"
  },
  "dependencies": {
    "express": "^5.2.1"
  }
}
```

`packages/core/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

Repeat for `bank`, `community`, `federation`. For packages that depend on `core`:

```json
{
  "dependencies": {
    "@fabric/core": "*"
  }
}
```

### 5. Install all dependencies

```bash
npm install
```

npm workspaces will symlink `@fabric/core` into the `node_modules` of dependent packages automatically.

### 6. Seed from LocalCommunity

The existing `LocalCommunity` project is the reference implementation. Migrate modules in this order to preserve a working state at each step:

1. **`core`** — copy `src/network/`, `src/storage/`, `src/http/`, `src/types/`, `src/auth/`
2. **`bank`** — copy `src/bank/`, relevant routes from `src/http/routes/`
3. **`community`** — copy everything else from `src/`, replace direct Bank imports with HTTP client calls
4. **`federation`** — new code; no direct equivalent in LocalCommunity
5. **`frontend`** — copy existing Svelte app; update API base URLs

### 7. Docker Compose (community node)

`docker-compose.community.yml`:
```yaml
services:
  bank:
    build: packages/bank
    ports:
      - "3001:3001"
    volumes:
      - bank-data:/data

  community:
    build: packages/community
    ports:
      - "3000:3000"
    environment:
      BANK_URL: http://bank:3001
    depends_on:
      - bank
    volumes:
      - community-data:/data

  frontend:
    build: packages/frontend
    ports:
      - "8080:8080"
    environment:
      COMMUNITY_URL: http://community:3000

volumes:
  bank-data:
  community-data:
```

---

## What LocalCommunity Preserves

The `LocalCommunity` project remains the working single-process prototype. It is the reference for:
- Business logic (demurrage formulas, endowment calculations, referendum rules)
- Data models and storage formats
- HTTP route structure
- Frontend pages and components

When in doubt about how something should work, `LocalCommunity` is the source of truth. The new monorepo is the same logic, restructured for production deployment.
