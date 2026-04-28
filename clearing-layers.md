# Clearing Layers — Federation, Commonwealth, and Globe

## Principle

The same clearing mechanics apply self-similarly at every scale. There is one currency — **kin** — defined as 1/10,000th of a person-year of labor. It is the same unit at the community, federation, commonwealth, and global levels. There are no exchange rates, no conversion spreads, and no distinct settlement currencies between layers.

This is the Keynes bancor design applied fractally. Keynes needed a separate bancor unit because nations had different domestic currencies. ECF has no that problem: kin *is* the bancor at every level simultaneously.

---

## Layer Summary

| Layer | Accounts held by | Credit lines based on | Demurrage charged on | Solidarity distributed to |
|---|---|---|---|---|
| **Federation** | Member communities | Population × `creditLineKinPerPerson` | Surplus above `creditLine × surplusThresholdMultiple` | Deficit communities (proportional to deficit depth) |
| **Commonwealth** | Member federations | Total federation population × same rate | Surplus federations | Deficit federations |
| **Globe** | Member commonwealths | Total commonwealth population × same rate | Surplus commonwealths | Deficit commonwealths |

Each layer is structurally identical. Only the entities holding clearing accounts differ.

---

## Federation Layer (implemented)

### What it does

- Holds a **clearing account** for each member community (denominated in kin)
- Issues **credit lines** proportional to each community's population at application time
- Charges **demurrage** monthly on balances exceeding `creditLine × surplusThresholdMultiple`
- Splits demurrage: `solidarityPoolFraction` → solidarity pool; remainder → federation treasury
- Redistributes the solidarity pool monthly to deficit communities, proportional to deficit depth
- Makes **structural aid grants** from an account with no overdraft floor (federation money creation; requires assembly authorisation)
- Computes **clearing fees** on inter-community transfers

### Credit line adjustment

Credit lines are currently set once at application approval (`memberCount × creditLineKinPerPerson`). A community's population grows — especially under migration during a crisis. **Outstanding gap**: the federation needs a mechanism to update a member's credit line when the community submits a census update, not only at initial application.

### Structural aid — money creation risk

Structural aid grants create unbacked kin. The structural aid account balance (negative = grants issued) is a public ledger item the assembly can monitor. Policy should establish a ceiling on total outstanding grants relative to network-wide kin supply. Structural aid is appropriate for:
- Bootstrapping a new community's social insurance pool (transition cohort that missed contribution years)
- Crisis/disaster recovery
- Absorbing a large migrant influx before the receiving community's census and credit line have caught up

It is not appropriate as ongoing operational subsidy — that is what solidarity redistribution is for.

### Constitution parameters (assembly-set)

| Parameter | Default | Meaning |
|---|---|---|
| `clearingFeeRate` | 0.002 | 0.2% fee on inter-community transfers |
| `creditLineKinPerPerson` | 500 | Credit line per capita at application |
| `surplusThresholdMultiple` | 2 | Demurrage kicks in above `creditLine × 2` |
| `surplusDemurrageRate` | 0.005 | 0.5% / month on excess surplus |
| `solidarityPoolFraction` | 0.5 | 50% of demurrage → solidarity pool |

---

## Commonwealth Layer (planned)

### Purpose

Handles what federation clearing cannot: events that put entire federations simultaneously into deficit. A continent-wide drought, a mass migration across federation boundaries, an epidemic. At these scales the clearing assumption (surpluses offset deficits) breaks down — there are no surplus federations to offset.

The commonwealth does not participate in day-to-day federation operations. Its activation is itself a signal that something extraordinary is occurring.

### Structure (mirrors federation)

- Each member **federation** holds a clearing account at the commonwealth clearing house
- Credit lines based on total federation population
- Monthly demurrage on surplus federations, solidarity pool redistributed to deficit federations
- **Catastrophic aid grants** from a no-floor account (commonwealth money creation; requires commonwealth assembly)
- **Reinsurance**: federation health insurance pools that cannot cover claims call on the commonwealth pool

### Health insurance reinsurance

Federation health pools cover normal variance in healthcare costs. Rare catastrophic events (epidemic, mass casualty) can exhaust a single federation's pool. The commonwealth reinsures federations against tail risk:
- Each federation pays a per-capita assessment into the commonwealth health reserve
- When a federation's health pool is depleted, it requests a reinsurance draw
- Commonwealth assembly authorises; transfer flows from commonwealth health reserve to the federation's clearing account
- Federation routes to its health pool

### Migration coordination

When a community must relocate entirely (climate displacement, infrastructure collapse):
1. Originating federation notifies commonwealth
2. Commonwealth assembly coordinates receiving federations — assesses capacity, distributes migrant communities across willing federations
3. Commonwealth issues transitional grants to receiving federations to cover credit line gap while census updates propagate
4. Portable `PersonCredential` allows individuals to be recognised in a new community without re-registration from scratch (requires credential portability work — see below)

### Inter-federation clearing

A federation running a food surplus ships to a food-deficit federation. Settlement:
- Surplus federation's commonwealth clearing account is credited
- Deficit federation's account is debited
- Same mechanics as inter-community clearing at the federation level
- Demurrage prevents indefinite surplus accumulation at this level too

---

## Global Layer (planned)

### Purpose

Handles what commonwealths cannot absorb unilaterally: global commons investment, planetary-scale resource flows, reinsurance of commonwealth tail risks.

### Global commons investment

Demurrage pressure cascades: a community that hoards faces federation-level pressure; a federation that hoards faces commonwealth-level pressure; a commonwealth that hoards faces global-level pressure. Surplus cannot hide anywhere in the stack.

The global clearing house's solidarity pool is the natural funding source for:
- Climate research and geoengineering coordination
- Space infrastructure (communications, resource mapping)
- Scientific institutions producing global public goods
- Reinsurance of commonwealth catastrophe pools

These investments are funded by redistributed surplus — kin that already exists, not newly created — which avoids inflationary pressure.

### Structure

Same mechanics again. Member commonwealths hold clearing accounts. Credit lines based on total commonwealth population. Monthly demurrage, solidarity redistribution, catastrophic aid grants requiring global assembly authorisation.

---

## Cross-cutting: Credential Portability

Currently `PersonCredential` is community-local. A person moving to a new community starts from scratch. At scale this is a serious friction point — especially during migration events.

Required design work:
- A portable identity layer where a person's credential can be introduced to a new community by their origin community (or by the federation as a trusted intermediary)
- The new community can verify the credential chain back to a known federation member
- Account history does not need to transfer — only identity continuity
- The origin community's census count decreases; the receiving community's increases; both credit lines adjust accordingly

This is a network layer concern but has implications for the community enrolment flow.

---

## Relationship to Existing Docs

- `architecture.md` — still references `kithe` as the federation currency; should be updated to `kin` (kithe has been removed)
- `banking-layer.md` — still references the currency board and kithe/kin distinction; should be updated
- `governance-layer.md` — check for any kithe or currency board references
