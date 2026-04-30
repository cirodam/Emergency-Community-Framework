# App-Scoped Permissions Plan

## Goal

Every community member can access every app (bank, market, mail, etc.) using their
single community credential. Each app has its own permission levels that control what
a member can do within that app. Permissions are governed by the community, not by
each app independently.

---

## Current Auth Architecture

1. **Login** — member authenticates at the community server, receives a signed
   `PersonCredential` token (base64url JSON).
2. **Credential structure** (signed payload covers all fields):
   ```
   personId, handle, personPublicKey,
   communityNodeId, communityPublicKey,
   issuedAt, expiresAt, signature
   ```
3. **Satellite apps** (bank, market, mail) cache the community's public key at
   startup and verify credentials locally — no round-trip required per request.
4. **`isSteward`** is not in the credential; each app that needs it must look it up
   separately (currently only community server does this).

---

## Approach: Extend PersonCredential with `appPermissions`

Add a `appPermissions: Record<string, string[]>` field to `PersonCredential`.
This field is included in the signed payload, so it cannot be tampered with.
Satellite apps read their own slice without any network call.

### Why this over alternatives

| Option | Pro | Con |
|--------|-----|-----|
| Extend credential (chosen) | No extra network calls; tamper-proof; offline-verifiable | Requires credential re-issue when roles change |
| Separate permissions endpoint | No credential changes | Round-trip per request or complex cache invalidation |
| App-local permission DB | Fully decoupled | Permissions drift out of sync with community governance |

Re-issuance on role change is acceptable — credentials already expire after 90 days,
and the frontend can re-fetch a fresh credential after a role confirmation.

---

## Permission Sets Per App

### `bank`
| Level | Who | Can do |
|-------|-----|--------|
| `member` | All members | Own accounts, own transfers, own history |
| `teller` | Holds "Teller" role in Community Bank domain | View any member's account, assist transfers |
| `admin` | Bank domain leader pool member | Reverse transactions, view all accounts |

### `market`
| Level | Who | Can do |
|-------|-----|--------|
| `member` | All members | Post classifieds, rent stalls, list services |
| `coordinator` | Holds "Marketplace Coordinator" role | Manage a specific marketplace's stalls and listings |
| `admin` | Market domain leader pool member | Remove any listing, suspend stalls, manage all marketplaces |

### `mail`
| Level | Who | Can do |
|-------|-----|--------|
| `member` | All members | Send/receive messages |
| `moderator` | Steward or designated role | View flagged messages, delete abusive content |

---

## Data Model Changes

### `packages/core/src/auth/PersonCredential.ts`

Add field to interface:
```typescript
export interface PersonCredential {
    // ... existing fields ...
    appPermissions: Record<string, string[]>; // e.g. { bank: ["teller"], market: ["coordinator"] }
}
```

Update `credentialPayload()` to include `appPermissions` in the signed JSON.

### `packages/community/src/person/PersonService.ts`

Update `issueCredential()` to:
1. Accept an optional `appPermissions` parameter (or compute it internally).
2. Include `appPermissions` in the signed payload and returned credential.

Add a helper `resolveAppPermissions(person: Person): Record<string, string[]>` that:
- Always includes `bank: ["member"]`, `market: ["member"]`, `mail: ["member"]` for
  active members.
- Checks if the person holds a role whose title matches a permission-granting role
  (see mapping table below).
- Checks if the person is in a domain leader pool that grants admin.

### Role → Permission Mapping (community server)

```
"Teller" role in Community Bank domain       → bank: teller
"Marketplace Coordinator" role               → market: coordinator
Any Community Bank leader pool member        → bank: admin
Any Market leader pool member                → market: admin
Steward flag                                 → mail: moderator
```

This mapping can start as a hardcoded table in `resolveAppPermissions` and be made
configurable later.

---

## Satellite App Changes

### New middleware helper (each app, or extracted to `@ecf/core`)

```typescript
// requireAppPermission("bank", "teller")
export function requireAppPermission(app: string, level: string): RequestHandler {
    return (req, res, next) => {
        const credential = (req as AuthedRequest).credential;
        const perms = credential?.appPermissions?.[app] ?? [];
        if (!perms.includes(level)) {
            return res.status(403).json({ error: `${level} access required` });
        }
        next();
    };
}
```

### Per-app middleware files

Each app gains a permission middleware alongside its existing `requireAuth`:

```typescript
// packages/bank/src/routes/middleware.ts
export const requireTeller = [requireAuth, requireAppPermission("bank", "teller")];
export const requireBankAdmin = [requireAuth, requireAppPermission("bank", "admin")];
```

### Route changes (bank example)

```typescript
router.get("/admin/accounts",              requireBankAdmin, accounts.listAll);
router.post("/admin/transactions/:id/reverse", requireBankAdmin, transactions.reverse);
router.get("/accounts/:ownerId",           requireTeller,    accounts.getByOwner);
```

---

## Frontend Changes

### Session store (`session.ts` in each app)

After login, decode the token and expose `appPermissions` to components:

```typescript
// existing: isSteward
// new:
const bankPerms = $derived($session?.appPermissions?.bank ?? []);
const isTeller  = $derived(bankPerms.includes("teller"));
const isBankAdmin = $derived(bankPerms.includes("admin"));
```

Components gate UI elements (buttons, pages) on these derived values.

---

## Implementation Sequence

### Phase 1 — Core credential extension
- [ ] Add `appPermissions` to `PersonCredential` interface and signed payload
- [ ] Add `resolveAppPermissions()` to `PersonService`
- [ ] Update `issueCredential()` to populate `appPermissions`
- [ ] Update `credentialPayload()` to include it in signature
- [ ] Validate with `npx tsc --noEmit -p packages/core/tsconfig.json`

### Phase 2 — Core middleware helper
- [ ] Add `requireAppPermission(app, level)` factory to `@ecf/core`
- [ ] Export it from `packages/core/src/index.ts`

### Phase 3 — Bank admin
- [ ] Add `reversalOf` field to `BankTransaction`
- [ ] Add `POST /admin/transactions/:id/reverse` route (requireBankAdmin)
- [ ] Add `GET /admin/accounts` route (requireTeller+)
- [ ] Bank frontend: admin page (transaction list, reversal button)
- [ ] Bank frontend: session exposes `isTeller`, `isBankAdmin`

### Phase 4 — Market admin
- [ ] Add `requireCoordinator`, `requireMarketAdmin` middleware
- [ ] Add admin routes: delete any listing, suspend stall
- [ ] Market frontend: coordinator/admin controls on listings and stalls

### Phase 5 — Mail moderation
- [ ] Add `POST /messages/:id/report` route
- [ ] Add moderator queue: `GET /admin/reports`
- [ ] Add `DELETE /admin/messages/:id` route (requireModerator)
- [ ] Mail frontend: report button on messages, moderator inbox

---

## Open Questions

1. **Credential refresh** — when a person's role changes, their credential needs
   re-issuing for new permissions to take effect. Options:
   - Automatic: community server re-issues on role confirmation (simplest)
   - Manual: user logs out and back in
   - Recommended: re-issue automatically in `confirmNomination` handler

2. **Permission revocation** — if a person is removed from a role, their existing
   credential still carries the old permissions until expiry (up to 90 days).
   Options:
   - Shorten TTL for credentialed members with elevated permissions (e.g. 24h)
   - Add a revocation list endpoint that satellite apps query at startup
   - Accept the gap for MVP (90 days is the worst case, roles rarely stripped suddenly)

3. **Multi-community federation** — when a person from another community accesses
   a federated app, they carry no `appPermissions` for this community's apps.
   They default to `member` level only. Fine for MVP.

4. **Configurable role→permission mapping** — hardcoded table is fine for MVP.
   Long-term: stewards should be able to assign permission levels to roles via the
   governance UI.
