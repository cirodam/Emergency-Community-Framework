# The Central Bank

## What it is

The central bank is the community's monetary institution. It is the sole entity authorized to create or destroy kin — the community's internal currency. No kin enters or leaves circulation except through the central bank.

It is not a lender. It does not set interest rates. It does not hold reserves against external obligations. It is a population-anchored issuance institution: its job is to ensure there is enough money in the community to let its members meet each other's needs, and to prevent that money from piling up in ways that stop it from circulating.

In the physical world, the central bank is a community institution like a credit union or a cooperative. It has staff — a coordinator and potentially a small council — who are accountable to the community through governance. They do not control monetary policy; that is set by referendum. They operate the institution: maintain the software, certify the ledger, handle exceptions, and report to the community.

---

## Why the money supply is pegged to population

The central bank starts from a simple question: how much money should exist?

The answer most economies give is: however much the market produces, subject to the state's control of interest rates and reserve requirements. That answer imports all the dynamics of capital accumulation, debt, and speculation. Those dynamics are not useful to a mutual aid community.

This system's answer is: one person-year of kin per person per year. If the community has 200 members, roughly 200 × kinPerPersonYear kin should exist in circulation at any given time. If 50 more people join, the supply grows. If 30 people leave, it contracts.

The reasoning:
- Money is a claim on labor and goods. If the claim is pegged to the number of claimants, no one can accumulate claims on labor that doesn't exist.
- An inflating supply (more money than people) means some members have claims they can never redeem in a community of this size — the money is socially meaningless.
- A deflating supply means members compete for a scarce medium of exchange, hoarding rather than spending. Mutual aid stops.
- Pegging to people makes the currency intrinsically social: its value is grounded in what the community's members can actually do for each other.

This is not a novel idea. Many local exchange trading systems (LETS) and time banks have operated on variants of this principle. The implementation here is more mechanized: the supply adjusts continuously through issuance and retirement events rather than by fiat of a board.

---

## Demographics as monetary policy

Because the money supply tracks population, the central bank is necessarily in the business of tracking demographics. The two are inseparable.

**Who counts:**
- Every active community member counts toward the supply target
- Retired members, suspended members, and dependents who are not yet members do not count for issuance (though births generate a one-time birth grant)

**Age matters:**
- Issuance is proportional to age in years. A 40-year-old joining the community brings 40 × kinPerPersonYear in accumulated life into the supply — a join endowment. A newborn brings a birth grant.
- On each member's birthday, the central bank issues one more person-year of kin on their behalf. The supply grows by kinPerPersonYear for each member per year, continuously.
- Retirement age (65 by default) is a threshold for social insurance payouts, not for issuance. Retirees continue receiving birthday issuances.

**What this means operationally:**
- The central bank must know every member's birth date. This is recorded at enrollment.
- Births into the community (children born to members) trigger a birth grant — a smaller issuance that marks the start of a person's kin journey before they are enrolled as a member.
- When a member leaves, their unspent pool entitlement is retired. The supply contracts to match.
- The central bank runs demographic reports: age distribution, working-age population, retiree count, dependency ratio. These inform the community's social insurance planning and help governance understand what monetary pressures are coming.

---

## How kin enters circulation

There are three issuance events:

**1. Birthday issuance (annual, per member)**
On a member's birthday, the central bank issues kinPerPersonYear on their behalf. The total is split:
- A small fraction (20% by default — `birthdayCirculationFraction`) goes directly to the member's primary account as spending money.
- The remainder goes to the social insurance retirement pool, where it accumulates as a deferred claim on future retirement payments.

This split reflects the dual nature of a person-year of kin: part of it is immediate purchasing power, part of it is a long-term liability the community is building up to.

**2. Join endowment (on enrollment)**
A person who joins at 40 has lived 40 years during which kin was not being issued on their behalf. The join endowment compensates for those prior years: age × kinPerPersonYear is issued.

The split here is:
- 80% (`endowmentPoolFraction`) to the social insurance pool — the bulk of a life's accumulated entitlement is deferred retirement.
- Of the remaining 20%: a fixed seed balance (`endowmentSeedBalance`, default 1,000 kin) goes to the member's account so they can participate immediately. The rest goes to the community treasury.

The seed balance grounds new members in the scale of the economy. Without it, a new member might feel they have to earn their way in before spending anything. The endowment is their stake; the seed is their first handful.

**3. Birth grant (on birth)**
When a member's child is born, the central bank issues a small fixed amount (`birthGrant`, default 500 kin) to the community fund, which forwards it to the newborn's account. Unlike the join endowment — which compensates for prior years — the birth grant simply marks the start. The newborn has no prior years to compensate for.

---

## How kin leaves circulation

**Demurrage**
Monthly, the central bank charges a small percentage of every member's primary balance above the demurrage floor. The collected kin flows back into the issuance account, retiring it from circulation — it ceases to exist.

Demurrage has two effects:
- It prevents balances from accumulating indefinitely. Members who earn far more kin than they spend will gradually see that surplus reclaimed and redistributed via the community treasury.
- It approximates a slow, automatic re-anchoring of the supply. If issuances slightly exceed retirements, demurrage corrects the drift over time.

The demurrage floor (default 1,000 kin) protects small balances. Only the portion of a balance above the floor is subject to demurrage. A member with 800 kin pays nothing; a member with 5,000 kin pays on the 4,000 above the floor.

The social insurance pool account is excluded from demurrage. It holds deferred liabilities, not circulating currency.

**Member departure (discharge)**
When a member leaves the community, their unspent social insurance entitlement — the amount they contributed to the pool minus what they received in retirement payouts — is retired. This contracts the supply to match the reduced population.

If the member's account doesn't have enough to cover the full retirement (they've spent it), the shortfall is logged and gradually recouped through future demurrage cycles. The supply tracking is not abandoned; it is deferred.

---

## What the central bank does not do

- It does not lend. There are no loans, no interest, no credit creation outside of the structural credit embedded in demurrage exemptions.
- It does not hold reserves against an external currency. Kin is not redeemable for anything outside the community.
- It does not make discretionary monetary decisions. Supply parameters (kinPerPersonYear, demurrageRate, demurrageFloor, endowmentPoolFraction, etc.) are set by referendum and encoded in the constitution. The central bank executes them.
- It does not know what members are buying or whom they're paying. It sees accounts and transfers, not economic meaning.

---

## Setting it up

The central bank initializes itself on first boot:

1. It registers as an institutional account owner with the community bank.
2. It opens one issuance account with no overdraft limit — this account is allowed to go arbitrarily negative. A negative balance means kin is in circulation; returning to zero means it has all been retired.
3. It persists its account IDs so they survive restarts.

No manual database setup is required. The central bank bootstraps from the bank's API using the same account-opening interface that any other institutional actor would use.

From that point on, it operates through scheduled tasks:

| Event | Trigger | Action |
|---|---|---|
| Birthday issuance | Member's birth date (annual) | Issue kinPerPersonYear; split to member account + pool |
| Join endowment | Member enrollment | Issue age × kinPerPersonYear; split to pool, seed, treasury |
| Birth grant | Child birth recorded | Issue birthGrant to community fund → newborn account |
| Demurrage sweep | Monthly scheduler | Charge rate × (balance − floor) on every member account |
| Discharge | Member departure | Retire unspent pool entitlement; log shortfall if insufficient |

---

## Governance

The central bank is a functional domain within community governance. It has a coordinator role (elected or sortitioned per the community's constitution) and participates in the domain structure alongside Food, Housing, Healthcare, and others.

The coordinator's responsibilities are operational, not policy-making:
- Ensuring the bank software is running
- Monitoring issuance and demurrage logs for anomalies
- Reporting demographic data and supply statistics to the assembly
- Handling edge cases (e.g. a member's birth date is recorded incorrectly)

Monetary policy parameters are governed by referendum:

| Parameter | What it controls | Default |
|---|---|---|
| `kinPerPersonYear` | Annual issuance per person; defines the unit of account | — |
| `bankDemurrageRate` | Monthly demurrage rate on balances above the floor | 2% |
| `demurrageFloor` | Balance protected from demurrage | 1,000 kin |
| `birthdayCirculationFraction` | Share of annual issuance going directly to the member | 20% |
| `endowmentPoolFraction` | Share of join endowment going to social insurance pool | 80% |
| `endowmentSeedBalance` | Fixed kin to member's account on joining | 1,000 kin |
| `birthGrant` | One-time issuance on birth | 500 kin |
| `retirementAge` | Age at which social insurance payments begin | 65 |
| `retirementPayoutRate` | Monthly flat payment to eligible retirees | 500 kin/mo |

Changes to any of these require a community referendum. The central bank coordinator has no unilateral authority to change supply parameters.

---

## Relationship to the bank

The central bank is a customer of the bank, not its owner. The community bank (the `packages/bank` layer) is pure infrastructure — it opens accounts, records transfers, enforces overdraft limits, and nothing else. The central bank instructs the bank; the bank executes.

This separation means:
- The bank code does not know what "demurrage" or "a birthday issuance" means. It processes transfer instructions.
- If the central bank software has a bug, the bank ledger remains consistent — every transaction recorded was explicitly requested.
- The bank can serve other institutional callers (the treasury, the marketplace, the social insurance pool) using exactly the same interface.

The central bank's issuance account is the only account in the system with no overdraft floor. Everything else is bounded.
