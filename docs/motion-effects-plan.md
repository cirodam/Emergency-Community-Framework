# Motion Effects Plan

Motions are the primary governance vehicle in ECF. Right now they carry prose — title and description — and produce an outcome, but that outcome has no automated consequence in the software. Separately, the `Proposal` system has a hardcoded `execute()` method in `ProposalService` that does handle side-effects (suspend-member, reinstate-member, constitution-amendment), but it is not extensible and is separate from the motion lifecycle.

This plan adds an **effect registry** to motions: any motion can optionally carry a structured `kind` and `payload`, and when it resolves as `"passed"`, the registry dispatches the appropriate handler. The system is designed to be the modding API for community governance — new packages can register new effect kinds without touching the motion system.

---

## Current state

| System | What it does | What it lacks |
|---|---|---|
| `Motion` + `MotionService` | Full deliberation lifecycle (draft → deliberating → voting → resolved for referenda; proposed → discussed → resolved for assembly/pool) | No payload, no automated consequences |
| `Proposal` + `ProposalService` | Pool-restricted voting with typed `ProposalType` and hardcoded `execute()` | Not extensible; separate from motion lifecycle; duplicate deliberation logic |
| `Constitution.amend()` | Applies parameter changes with constraints | Only called from `ProposalService.execute()` — not reachable from motions |

The `Proposal` system is the right idea expressed as a closed enum. The motion effects system is an open registry version of the same concept.

---

## Design

### Two new fields on every motion

```typescript
// in AssemblyMotionData (packages/core/src/governance/AssemblyMotion.ts)
kind:    string | null;   // effect type key; null = plain discussion motion
payload: string | null;   // JSON-encoded arguments for the handler
```

A motion with `kind = null` is exactly what motions are today — nothing changes. A motion with `kind = "amend-constitution"` carries a structured amendment in its payload and, on passing, the registered handler fires.

### The effect registry

```typescript
// packages/community/src/governance/EffectRegistry.ts

export type EffectContext = {
    motion: Motion;
    payload: Record<string, unknown>;
};

export type EffectHandler = (ctx: EffectContext) => Promise<void>;

export type PayloadValidator = (raw: unknown) => string | null; // returns error string or null

export interface EffectDefinition {
    handler:   EffectHandler;
    validate:  PayloadValidator;
    label:     string;          // human-readable: "Amend constitution"
    bodyHint?: "referendum" | "assembly"; // optional: suggested governing body
}

class EffectRegistry {
    private defs = new Map<string, EffectDefinition>();

    register(kind: string, def: EffectDefinition): void {
        this.defs.set(kind, def);
    }

    getDefinition(kind: string): EffectDefinition | undefined {
        return this.defs.get(kind);
    }

    listKinds(): { kind: string; label: string; bodyHint?: string }[] {
        return [...this.defs.entries()].map(([kind, def]) => ({
            kind, label: def.label, bodyHint: def.bodyHint,
        }));
    }

    async dispatch(motion: Motion): Promise<void> {
        if (!motion.kind) return;
        const def = this.defs.get(motion.kind);
        if (!def) throw new Error(`No handler registered for effect kind "${motion.kind}"`);
        const payload = JSON.parse(motion.payload ?? "{}") as Record<string, unknown>;
        await def.handler({ motion, payload });
    }

    validatePayload(kind: string, raw: unknown): string | null {
        return this.defs.get(kind)?.validate(raw) ?? `Unknown effect kind "${kind}"`;
    }
}

export const effectRegistry = new EffectRegistry();
```

### Dispatch point

In `MotionService.recordOutcome()` (for assembly/pool bodies) and `MotionService.closeVoting()` (for referenda), after setting `outcome = "passed"` and before saving:

```typescript
if (motion.outcome === "passed" && motion.kind) {
    await effectRegistry.dispatch(motion);
}
```

Because `better-sqlite3` is synchronous and the handlers call in-process services (not network), the transaction boundary is: if the handler throws, the outcome is **not saved** — the clerk/vote-close must retry. This is the simplest model and avoids a window where the motion passed but the effect didn't fire.

### Payload validation at creation

In `MotionController.createMotion()`, if `kind` is provided:

```typescript
if (kind) {
    const err = effectRegistry.validatePayload(kind, payload);
    if (err) return res.status(400).json({ error: err });
}
```

Malformed proposals are rejected immediately, before deliberation begins.

---

## Built-in effect kinds

These ship with the `community` package and are registered at startup in `index.ts`.

| Kind | Label | Suggested body | Payload |
|---|---|---|---|
| `amend-constitution` | Amend constitution | referendum | `{ parameter: string, newValue: number \| boolean }` |
| `suspend-member` | Suspend member | referendum or assembly | `{ personId: string }` |
| `reinstate-member` | Reinstate member | referendum or assembly | `{ personId: string }` |
| `add-role` | Add leadership role | assembly | `{ name: string, description: string }` |
| `remove-role` | Remove leadership role | assembly | `{ poolId: string }` |
| `accept-nomination` | Accept nomination to pool | pool | `{ nominationId: string }` |

The `bodyHint` is advisory — it appears in the UI to steer users toward the right body, but the motion system does not enforce it. Any motion can go to any body; the body can refer it elsewhere if appropriate.

---

## What this does not do (intentionally)

- **Does not enforce which body governs which kinds.** That is a community governance decision, not a software constraint. The assembly can accept a constitution amendment; the referendum can accept a nomination. The community decides.
- **Does not replace the Proposal system immediately.** Proposals have pool-restricted voting and a time-to-live — different mechanics from motions. They remain for pool-internal decisions until explicitly migrated.
- **Does not add network calls or async queuing.** All built-in handlers are in-process. External integrations (e.g. central bank parameter updates) are future work and may need a retry queue.

---

## Schema changes

### `packages/core/src/governance/AssemblyMotion.ts`

Add to `AssemblyMotionData`:
```typescript
kind:    string | null;
payload: string | null;
```

Add to `AssemblyMotion` constructor opts and class fields (both optional, default `null`).
Add to `baseData()` serialization.

### `packages/community/src/governance/Motion.ts`

No changes needed beyond picking up the base fields — `MotionData extends AssemblyMotionData` will gain them automatically.

### `packages/community/src/governance/MotionService.ts`

- `create()` opts: add optional `kind?: string`, `payload?: string`
- `recordOutcome()` and `closeVoting()`: call `await effectRegistry.dispatch(motion)` on pass

### `packages/community/src/routes/MotionController.ts`

- `createMotion`: accept `kind` and `payload` in body; validate payload if kind is present
- `toDto()`: include `kind` and `payload` in the response

### `packages/community/frontend/src/lib/api.ts`

- `createMotion` input: add `kind?: string`, `payload?: unknown`
- `MotionDto`: add `kind: string | null`, `payload: string | null`

### New file: `packages/community/src/governance/EffectRegistry.ts`

As designed above.

### New file: `packages/community/src/governance/effects/index.ts`

Registers all built-in effects at startup. Imported once in `index.ts`.

---

## Frontend changes

### Motion create form (ProposalsPage, AssemblyPage, PoolPage)

Add an optional "Effect" section below the description field:
- A `<select>` listing registered kinds (from a new `GET /api/motions/effects` endpoint or hardcoded from a shared constants file)
- When a kind is selected, a kind-specific form renders the payload fields
- The payload is serialized to JSON and sent with the motion

The kind-specific payload forms:
- `amend-constitution`: parameter dropdown (from constitution keys) + new value input
- `suspend-member` / `reinstate-member`: member picker (select from active members)
- `add-role`: name + description text inputs
- `remove-role`: pool picker
- `accept-nomination`: nomination picker (list open nominations for this pool)

These can be built as a small `EffectPayloadForm.svelte` component that switches on `kind`.

---

## Replacing the Proposal system

The `Proposal` system is deleted as part of this implementation — there is no existing data to migrate. Once the effect registry has `add-member`, `suspend-member`, `reinstate-member`, `constitution-amendment`, `change-role`, `pool-change`, and `budget-change` handlers, proposals have no remaining purpose.

Files to delete:
- `packages/community/src/governance/Proposal.ts`
- `packages/community/src/governance/ProposalService.ts`
- `packages/community/src/governance/ProposalLoader.ts`
- `packages/community/src/routes/proposalRoutes.ts` (or equivalent)
- Any `ProposalPage.svelte` and related frontend components
- Proposal types and API functions from `frontend/src/lib/api.ts`

Do this as the final step of implementation order (step 7), after the effect registry is complete and type-check is clean.

---

## Implementation order

1. **Core schema** — Add `kind`/`payload` to `AssemblyMotionData` and `AssemblyMotion` base class. Update `toData()`/`fromData()` in community `Motion` and federation `FederationMotion`. Type-check clean.
2. **EffectRegistry** — Create `EffectRegistry.ts`. No handlers yet.
3. **Dispatch wiring** — Wire `effectRegistry.dispatch()` into `MotionService`. No-op until handlers are registered.
4. **Built-in effects** — Implement `effects/index.ts` with the built-in kinds, starting with `amend-constitution` (already proven in `ProposalService.execute()`).
5. **API layer** — Update `MotionController` and `api.ts` to pass `kind`/`payload` through.
6. **Frontend** — `EffectPayloadForm.svelte`; update create forms.
7. **Proposal migration** — Redirect old proposal flows to motion + effect.
