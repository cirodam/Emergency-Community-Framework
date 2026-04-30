# ECF Core Refactor Plan

This document tracks planned structural improvements to the ECF monorepo.
Each step is independent and can be merged separately.

---

## Step 1 — BaseLoader ✅ DONE

**Problem:** Every package has ~15 loader files with identical boilerplate:
`new FileStore(dir)`, `save(entity)`, `loadAll()`. ~45 files across community,
federation, and commonwealth.

**Solution:** Add `BaseLoader<TData, TEntity>` to `core/src/storage/`:

```ts
export abstract class BaseLoader<TData, TEntity> {
    protected store: FileStore;
    constructor(dir: string) { this.store = new FileStore(dir); }
    abstract fromData(d: TData): TEntity;
    abstract toData(e: TEntity): TData;
    save(entity: TEntity): void { const d = this.toData(entity); this.store.write((d as any).id, d); }
    loadAll(): TEntity[] { return this.store.readAll<TData>().map(d => this.fromData(d)); }
}
```

Each loader becomes:

```ts
export class MotionLoader extends BaseLoader<MotionData, Motion> {
    fromData(d: MotionData): Motion { return Motion.fromData(d); }
    toData(m: Motion): MotionData   { return m.toData(); }
}
```

**Files affected:** all `*Loader.ts` files in community, federation, commonwealth (~45).

**Risk:** Low — purely mechanical, no logic changes.

---

## Step 2 — Assembly motion (clerk path only) ✅ DONE

**Problem:** `FederationMotion` and community `Motion` (assembly/leader-pool body)
have identical state machines for the clerk path:
`proposed → discussed → voted → resolved`.
Only the voter identity type differs.

**Solution:** Add `AssemblyMotion<TVote, TComment>` to `core/src/governance/`:

```ts
export type ClerkStage  = "proposed" | "discussed" | "voted" | "resolved";
export type MotionOutcome = "passed" | "failed" | "withdrawn" | "referred";

export class AssemblyMotion<TVote, TComment> {
    // stage machine: proposed → discussed → voted → resolved
    // votes: TVote[]
    // comments: TComment[]
    // toData() / fromData() with generic type params
}
```

Community `Motion` (assembly/pool body) and `FederationMotion` both extend this.
Community referendum path stays in `Motion` only — federation has no referendum.

**Files affected:**
- `core/src/governance/AssemblyMotion.ts` (new)
- `community/src/governance/Motion.ts` (assembly path delegates to base)
- `federation/src/governance/FederationMotion.ts` (extends base)

**Risk:** Medium — touch active governance code. Full tsc + integration test after.

---

## Step 3 — AssemblyTerm ✅ DONE

**Problem:** `FederationAssemblyTerm` and the community assembly term (implicit in
`MotionService` + `LeaderPool`) share the same structure:
`seats[], motionIds[], start/end, getSeat(), vacantSeats, seatedDelegates`.

**Solution:** Add `AssemblyTerm<TSeat>` to `core/src/governance/`:

```ts
export interface AssemblySeat {
    memberId:        string;  // personId at community level; communityMemberId at federation
    memberHandle:    string;
    delegateHandle:  string | null;  // null = member IS the delegate (community level)
    delegateName:    string | null;
    seatedAt:        string | null;
}

export class AssemblyTerm<TSeat extends AssemblySeat> {
    seats: TSeat[];
    motionIds: string[];
    // getSeat(), vacantSeats, seatedDelegates, toData(), fromData()
}
```

At community level `delegateHandle === memberHandle` (same person).
At federation level `delegateHandle` is the nominated person from that community.

**Files affected:**
- `core/src/governance/AssemblyTerm.ts` (new)
- `federation/src/governance/FederationAssemblyTerm.ts` (extends base)
- community assembly term if one exists, or new `AssemblyTerm` instantiation

**Risk:** Medium — depends on Step 2 being stable first.

---

## Step 4 — MemberApplication base ✅ DONE

**Problem:** The application flow (`pending → under_review → approved → rejected`)
exists in three packages:
- `community/src/applications/MemberApplication.ts`
- `federation/src/FederationApplication.ts`
- `commonwealth/src/CommonwealthApplication.ts`

Same state machine, same review logic, different field names for the applicant.

**Solution:** Add `BaseApplication<TApplicant>` to `core/src/`:

```ts
export type ApplicationStatus = "pending" | "under_review" | "approved" | "rejected";

export abstract class BaseApplication<TApplicant> {
    id: string;
    status: ApplicationStatus;
    submittedAt: string;
    reviewedAt: string | null;
    reviewNote: string;
    abstract applicant: TApplicant;

    review(status: "approved" | "rejected" | "under_review", note?: string): void { ... }
}
```

**Files affected:**
- `core/src/BaseApplication.ts` (new)
- 3 application files (extend base)
- 3 application services (remove duplicated review logic)

**Risk:** Low-medium — state machine is simple and stable.

---

## Step 5 — FunctionalDomain + DomainService base ✅ DONE

**Problem:** `FunctionalDomain` and `DomainService` exist in community, federation,
and commonwealth with the same `registerDomain()`, `listDomains()`, `getDomainById()`
interface.

**Solution:** Add `BaseFunctionalDomain` and `BaseDomainService` to `core/src/common/`:

```ts
export abstract class BaseFunctionalDomain {
    abstract id: string;
    abstract name: string;
    abstract description: string;
    abstract toSummary(): object;
}

export class BaseDomainService<T extends BaseFunctionalDomain> {
    private domains = new Map<string, T>();
    registerDomain(d: T): void { this.domains.set(d.id, d); }
    getDomainById(id: string): T | undefined { return this.domains.get(id); }
    listDomains(): T[] { return [...this.domains.values()]; }
}
```

**Files affected:**
- `core/src/common/BaseFunctionalDomain.ts` (new)
- `core/src/common/BaseDomainService.ts` (new)
- `community/src/common/domain/FunctionalDomain.ts` (extend base)
- `community/src/DomainService.ts` (extend base)
- `federation/src/common/FederationFunctionalDomain.ts` (extend base)
- `federation/src/common/FederationDomainService.ts` (extend base)
- `commonwealth/src/common/CommonwealthFunctionalDomain.ts` (extend base)
- `commonwealth/src/common/CommonwealthDomainService.ts` (extend base)

**Risk:** Low — interface is stable and simple.

---

## Step 6 — BaseDemurrageScheduler ✅ DONE

**Problem:** `FederationDemurrageScheduler` and `CommonwealthDemurrageScheduler`
are nearly identical: periodic sweep, apply surplus demurrage to clearing accounts,
deposit into treasury.

**Solution:** Add `BaseDemurrageScheduler` to `core/src/`:

```ts
export abstract class BaseDemurrageScheduler {
    protected abstract getSurplusThreshold(accountId: string): number;
    protected abstract applyDemurrage(accountId: string, amount: number): Promise<void>;
    protected abstract sweepInterval(): number;
    start(): void { /* setInterval → sweep() */ }
    stop(): void { /* clearInterval */ }
    private async sweep(): Promise<void> { /* iterate accounts, compute surplus, apply */ }
}
```

**Files affected:**
- `core/src/BaseDemurrageScheduler.ts` (new)
- `federation/src/FederationDemurrageScheduler.ts` (extend base)
- `commonwealth/src/CommonwealthDemurrageScheduler.ts` (extend base)

**Risk:** Low-medium — scheduler logic is isolated and testable.

---

## Order of execution

1. **Step 1** (loaders) — no logic changes, safe to do any time
2. **Step 4** (application base) — self-contained, no governance dependency
3. **Step 5** (domain service) — self-contained
4. **Step 2** (assembly motion) — needs careful testing
5. **Step 3** (assembly term) — after Step 2 is stable
6. **Step 6** (demurrage) — lowest priority, only two files affected

## What does NOT move to core

| Thing | Reason |
|---|---|
| `Constitution` | Parameter sets differ too much at each level |
| `MemberService` | Credit lines, public keys, census integration are level-specific |
| `Census` | Completely different semantics at each level |
| `ClearingHouse` | Bank account topology differs by level |
| Referendum path | Community-only by design |
