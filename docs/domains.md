# ECF Community Domains

A **domain** is a functional area of community operations. Each domain is a persistent institution within the community node — it has a stable ID, appears in governance, can have functional units, roles, leader pools, and a budget. Some domains also own a bank account.

Domains fall into two categories:

- **Required domains** — created on first boot by `seedDomains`. The community cannot function without them. Their IDs are hardcoded constants so they can be referenced from monetary logic, governance, and satellite apps.
- **Optional domains** — also seeded by default for most communities, but their absence would not break core operations.

---

## Required Domains

### 1. Central Bank
**ID:** `ecf-domain-central-bank-0000000001`
**Handle:** `central-bank`
**Bank account:** Yes — handle `"issuance"`, `primary: true`, overdraft limit `-Infinity` (issuance accounts must be able to go negative)
**Purpose:** The sole entity authorized to create and destroy kin. Issues kin on member join (endowment) and anniversaries; retires kin via demurrage and on member discharge. Sets no interest rates and holds no external reserves — it is a population-anchored issuance institution.
**Key invariant:** Total kin in circulation ≈ population × `kinPerPersonYear`.

### 2. Retirement
**ID:** `ecf-domain-retirement-000003`
**Handle:** `retirement`
**Bank account:** Yes — handle `"retirement"`, `primary: true`, no overdraft
**Purpose:** Holds the community's mutual aid reserve. A fraction of every member's join endowment and annual issuance is routed here. The pool pays out to members who fall below a threshold balance (e.g. after illness, disability, or hardship). Governed by the constitution's insurance parameters.

### 3. Community Treasury
**ID:** `ecf-domain-community-treasury-000002`
**Handle:** `treasury`
**Bank account:** Yes — handle `"treasury"`, `primary: true`, no overdraft
**Purpose:** The shared budget for community operations. Funded by a portion of member join endowments (the circulating fraction after insurance allocation). Spending flows through domain budget allocations and governance-approved referenda. Holds the Treasurer role.

### 4. Community Bank
**ID:** `ecf-domain-community-bank-000000004`
**Handle:** `community-bank`
**Bank account:** No (the bank satellite app manages accounts directly)
**Purpose:** The governance and staffing wrapper for the bank satellite app. Holds the Teller role and the bank leadership pool. Provides the domain entry point for bank-related governance motions.

---

## Optional Domains (seeded by default)

These are created on first boot alongside the required domains. They have no mandatory bank accounts.

| Domain | ID |
|---|---|
| Food | `ecf-domain-food-000000006` |
| Agriculture | `ecf-domain-agriculture-000000007` |
| Healthcare | `ecf-domain-healthcare-000000008` |
| Housing | `ecf-domain-housing-000000009` |
| Energy | `ecf-domain-energy-000000010` |
| Communications | `ecf-domain-communications-000000011` |
| Deathcare | `ecf-domain-deathcare-000000012` |
| Sanitation | `ecf-domain-sanitation-000000013` |
| Water | `ecf-domain-water-000000014` |
| Fire | `ecf-domain-fire-000000015` |
| Childcare | `ecf-domain-childcare-000000016` |
| Dependency Care | `ecf-domain-dependency-care-000000017` |
| Education | `ecf-domain-education-000000018` |
| Enrichment | `ecf-domain-enrichment-000000019` |
| Transit | `ecf-domain-transit-000000020` |
| Courier | `ecf-domain-courier-000000021` |
| Market | `ecf-domain-market-000000022` |

---

## Treasury Account

The Community Treasury's bank account is the single most important account in the community's monetary system after the central bank issuance account. It is created on first boot with these parameters:

```
owner:    institution ("Community Treasury")
label:    "Community Treasury"
currency: "kin"
handle:   "treasury"
primary:  true
```

It cannot go into overdraft. All flows through it are traceable as bank transactions with memos. No kin is destroyed when it passes through the treasury — unlike demurrage, which retires kin.

---

## Adding a Domain

To add a new required domain:

1. Create a `FunctionalDomain` subclass in `packages/community/src/domains/<name>/`.
2. Assign a hardcoded `DOMAIN_ID` constant (continue the numbering sequence).
3. Register it in `seedDomains()` in `packages/community/src/bootstrap/seedDomains.ts`.
4. If it needs a bank account, initialize it in `server.ts` alongside the other monetary domains.

Optional domains that are not universally needed should not be given hardcoded IDs unless another part of the system needs to reference them directly.
