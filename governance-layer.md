# Governance Layer

## Purpose

The governance layer constitutes the community or federation as a legal and political entity on the network. It is what gives the network layer meaning — a heart node's key is authoritative not because of any technical property, but because governance defines it as the community's identity.

Governance is relatively low-volume. Decisions are made infrequently compared to the operational traffic (banking, messaging) they authorize. However, governance outputs have lasting effects: a referendum result changes demurrage rates for months, an election determines who staffs councils for years.

---

## The Heart Node

Every community, federation, infrastructure node, and forum is anchored by a heart node. The heart node is the governance container — the process that holds the entity's governing records, runs whatever decision-making processes apply to that entity type, issues ownership certificates to subsidiary nodes, and owns the operational services beneath it.

**The heart node's public key is the community's identity on the network.** It is the root of trust from which all other nodes in the community's constellation derive their legitimacy.

Implications:
- A bank container cannot operate without an ownership certificate issued by its community's heart node
- If a community dissolves, its heart node's certificates expire and its subsidiary nodes fall out of the trusted network
- Rotating the heart node key is a significant governance event — it requires re-issuing certificates to all subsidiary nodes and notifying the federation

---

## What Governance Owns

Governance constitutes and controls all operational services beneath it:

- **The community bank** — governance sets monetary policy parameters (demurrage rate, endowment size, social insurance rates). The bank executes these parameters without re-consulting governance per transaction.
- **The messaging service** — governance sets access rules, retention policy, moderation structure.
- **Domains** — governance creates and dissolves functional domains (Food, Healthcare, Housing, etc.) and appoints or elects domain coordinators.
- **Levies** — governance sets the kithe levy paid to affiliated federations.

Governance does not operate these services — it mandates the rules under which they operate. The dependency arrow is always: **governance → operational services**, never the reverse.

---

## Community Governance

### Members

Members are the political unit of a community. Governance rights attach to membership, not to account balances or labor contributions.

- Members have endowments, care needs, guardians, trust scores
- Membership is established through an application and community vote
- Members vote in referenda and elections

### Referenda

The primary mechanism for community decision-making. Any member can propose a referendum. Passage thresholds and quorum requirements are set by the community's constitution.

Referendum outputs are signed policy documents delivered to the relevant operational service (bank, messaging, etc.) as authoritative instructions.

### Elections and Sortition

- Elected councils for domains requiring sustained coordination
- Qualified sortition for roles requiring impartiality (judicial, oversight)
- Sortition pools are filtered by relevant qualifications, not open to all members indiscriminately

### Constitution

The community's foundational ruleset. Sets:
- Membership criteria
- Referendum thresholds and quorum
- Endowment formula
- Which roles are elected vs. sortitioned
- Term lengths

The constitution itself is amended by referendum, typically at a higher threshold than ordinary decisions.

---

## Federation Governance

A federation is governed by its affiliated community nodes, not by individuals. Voting weight is proportional to contribution, population, or a formula determined by the federation's own governance.

- Every affiliated community has a voice regardless of size
- Federation referenda set levy formulas, settlement rules, and inter-community policy
- The federation heart node issues certificates to federation-level subsidiary nodes (federal bank, etc.)
- Staff working at federation infrastructure are still members of their home communities — their political life is there, not at the federation

---

## Policy Outputs

Governance produces signed policy documents that operational services consume:

```ts
interface PolicyUpdate {
  domain: "bank" | "messaging" | string;   // which service this affects
  parameter: string;                        // e.g. "demurrageRate", "retentionDays"
  value: unknown;
  effectiveAt: Date;
  referendumId: string;                     // the decision that produced this
  signature: string;                        // signed by heart node
}
```

Operational services verify the signature and apply the update at the specified time. They do not need to re-query governance to confirm the decision is still valid — the signed document is self-contained.

---

## Governance Does Not Depend on Banking

This is a critical invariant. Governance can function — hold referenda, elect councils, amend the constitution — even if the bank container is down. The bank depends on governance for its mandate, not the other way around.

This means:
- Governance stores no account balances and performs no transactions
- Governance refers to accounts by ID when necessary (e.g. "endowment goes to account X") but does not query balances
- Financial eligibility checks (e.g. "does this member have sufficient funds?") are the bank's responsibility, not governance's

---

## File Layout

```
src/
  member/
    Member.ts                  — Member record
    MemberService.ts           — Membership lifecycle
    MemberLoader.ts            — Persistence
    MemberApplication.ts       — Application record
    ApplicationService.ts      — Application and onboarding flow
  referendum/
    Referendum.ts              — Referendum record
    ReferendumService.ts       — Lifecycle, voting, passage logic
    ReferendumLoader.ts        — Persistence
  settings/                    — Community constitution and configuration
  sortition/                   — Qualified sortition pool management
  domains/                     — Functional domain records and coordinator assignment
  councils/                    — Council membership and term tracking
```
