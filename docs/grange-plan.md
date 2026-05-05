# Grange Satellite App — Planning Document

A farm contract management system. Communities register farm associations, negotiate growing contracts, track seasonal deliveries, and settle harvests. The Grange is the institutional home of the community's food production relationships — both with local farms and with farms contracted through other communities via the federation.

The name is intentional. The Patrons of Husbandry — the Grange — was the original American institution for giving small farms collective power against markets, banks, and railroads. This is the same relationship, rebuilt for communities rather than individual farms.

---

## Concepts

### Farm Association

A farm registered with the community as an eligible contracting partner. A farm association is a private entity — the Grange does not govern how the farm operates internally. The association record is the community's knowledge of the farm and the basis for contract eligibility.

**Fields:**
- `id`, `createdAt`, `updatedAt`
- `name: string`
- `homeCommunityId: string` — the community that governs this farm (may differ from the contracting community)
- `operatorIds: string[]` — member IDs of people who work the farm; at least one must be a community member
- `location: string` — address or GPS coordinates
- `acreage: number`
- `practices: PracticeDeclaration` — declared methods (see below)
- `status: FarmStatus` — `pending | eligible | suspended | retired`
- `eligibilityMotionId: string | null` — motion that approved eligibility
- `contracts: string[]` — IDs of all contracts, past and present

**Eligibility requirements (community-defined, stored in community config):**
- Maximum acreage (prevents corporate aggregation)
- Proximity radius (farm must be within X miles)
- No operator may hold more than one active contract
- Practice declaration must be on file before first contract

### Practice Declaration

A farm's declared approach to growing. The community does not verify this at registration — verification happens through seasonal inspections. False declarations are grounds for contract suspension.

**Fields:**
- `soilMethods: string[]` — e.g. `["cover-cropping", "no-till", "composting"]`
- `prohibitedInputs: string[]` — e.g. `["synthetic-pesticides", "synthetic-fertilizers", "gmo-seed"]`
- `waterSource: string` — well, municipal, rainwater, irrigation district, etc.
- `cropDiversity: string` — free text description of rotation and polyculture approach
- `seedSource: string` — purchased commercial, saved seed, community seed library, mix
- `notes: string` — anything else relevant

### Farm Contract

The core document. A farm contract specifies what the farm will grow, what the community will pay, and what the community will provide in return. Contracts are annual by default; perennial crop contracts run 3–5 years with annual review.

**Fields:**
- `id`, `createdAt`, `updatedAt`
- `farmId: string`
- `contractingCommunityId: string` — the community paying for the food
- `needsProjectionId: string` — the projection this contract responds to
- `contractType: ContractType` — `annual | perennial`
- `plantingWindow: PlantingWindow` — which seasonal window this contract belongs to (see below)
- `cropPlan: CropPlanEntry[]` — what the farm commits to growing (see below)
- `paymentTerms: PaymentTerms` — base, advance, floor, ceiling, surplus split
- `resourceCommitments: ResourceCommitment[]` — what the community provides
- `advancePaidAt: string | null` — ISO 8601, when advance payment was made
- `deliveries: DeliveryRecord[]` — recorded at intake
- `inspections: InspectionRecord[]` — mid-season practice checks
- `settlement: SettlementRecord | null` — final reconciliation at season end
- `status: ContractStatus` — `proposed | approved | active | fulfilled | disputed | cancelled`
- `approvalMotionId: string | null`
- `notes: string`

### Crop Need Entry

One line item in a needs projection. Represents the community's willingness to contract for a specific crop up to a stated volume — not a demand, but a signal and a budget ceiling.

**Fields:**
- `id: string`
- `crop: string` — e.g. `"hard red winter wheat"`, `"pinto beans"`, `"dent corn"`
- `category: CropCategory` — `grain | legume | vegetable | fruit | forage | other`
- `maxContractLbs: number` — the most the community is willing to contract for this crop this window (storage capacity, budget, and consumption estimate drive this)
- `minDesiredLbs: number` — the volume below which the community considers the window under-covered and may seek additional contracts or federation sourcing
- `estimatedPaymentPerLbKin: number` — the community's published price signal; farms negotiate from this
- `notes: string` — context for farmers (e.g. "prioritize open-pollinated varieties", "staggered delivery preferred")

The gap between `minDesiredLbs` and `maxContractLbs` is intentional headroom — the community is willing to contract more if farms can grow it, but the floor is what they're actually counting on.

### Crop Plan Entry

One row in a contract's crop plan. Each entry is a farm's offer to produce a specific crop in response to a crop need entry in the projection.

**Fields:**
- `cropNeedEntryId: string` — the specific line item in the projection this entry responds to
- `crop: string` — e.g. `"hard red winter wheat"`, `"pinto beans"`, `"dent corn"`
- `category: CropCategory` — `grain | legume | vegetable | fruit | forage | other`
- `acreage: number` — acreage dedicated to this crop
- `estimatedYieldLbs: number` — farmer's estimate at contract signing
- `floorYieldLbs: number` — below this, community absorbs the loss; farm still paid in full
- `ceilingYieldLbs: number` — above this, surplus split applies
- `deliverySchedule: DeliveryScheduleEntry[]` — expected delivery dates and volumes
- `reserveAllocationPct: number` — what percentage of delivered yield goes to the community reserve vs. open market (0–100)

### Payment Terms

**Fields:**
- `basePaymentKin: number` — total kin paid for full contracted delivery
- `advancePaymentKin: number` — paid at planting, deducted from base at settlement
- `advanceMilestones: PaymentMilestone[]` — optionally stage advances against practice milestones rather than a single payment
- `surplusSplitFarmerPct: number` — farmer's share of above-ceiling yield value (e.g. 60)
- `surplusSplitCommunityPct: number` — community's share (e.g. 40; must sum to 100 with farmer pct)
- `externalPaymentUsd: number | null` — optional dollar component for farmers not yet fully in the kin economy; null if kin-only

The `externalPaymentUsd` field exists explicitly for the transition period. A farm that is not yet a community member and does not hold kin can still enter a contract with a dollar payment component. This is expected to phase out as farm operators join the community.

### Resource Commitment

What the community promises the farm in addition to payment. These are tracked separately from payment because they are operational commitments, not monetary ones.

**Fields:**
- `type: ResourceType` — `equipment | labor | seed | inputs | infrastructure`
- `description: string`
- `quantity: number | null`
- `unit: string | null` — e.g. `"hours"`, `"lbs"`, `"days"`
- `scheduledDates: string[]` — ISO 8601 dates when commitment is expected to be fulfilled

### Delivery Record

Recorded at intake when the farm delivers against the contract.

**Fields:**
- `id`, `recordedAt`
- `cropPlanEntryId: string`
- `actualYieldLbs: number`
- `moisturePct: number | null` — measured at intake; relevant for grains
- `receivedBy: string` — member handle of person recording intake
- `notes: string`
- `reserveAllocatedLbs: number` — how much went to the reserve
- `marketAllocatedLbs: number` — how much went to open market

### Inspection Record

A mid-season practice check by a Farmers pool member.

**Fields:**
- `id`, `conductedAt`
- `inspectorId: string`
- `findings: string` — narrative description
- `practiceViolations: string[]` — if any declared practices were not being followed
- `outcome: InspectionOutcome` — `compliant | minor-concern | violation | critical-violation`
- `followUpRequired: boolean`
- `followUpDate: string | null`

### Settlement Record

Final reconciliation at season end.

**Fields:**
- `settledAt: string`
- `totalDeliveredLbs: number` — across all crops
- `basePaymentPaid: number` — kin
- `surplusPaymentPaid: number` — kin; 0 if no surplus
- `shortfallAbsorbed: number` — kin value of yield below floor that community absorbed
- `advanceReconciled: number` — advance amount deducted from final payment
- `externalPaymentUsd: number | null`
- `notes: string`
- `disputeRaised: boolean`

---

## Status Lifecycles

### Farm Association
```
pending → eligible → suspended
                   → retired
```
- `pending` — application submitted, awaiting Farmers pool review and assembly motion
- `eligible` — approved; can enter contracts
- `suspended` — practice violation or contract dispute under review; no new contracts
- `retired` — farm is no longer operating or has exited the community relationship

### Farm Contract
```
proposed → approved → active → fulfilled
                             → disputed → fulfilled (after resolution)
                                        → cancelled (if unresolvable)
         → cancelled (before approval)
```

---

## Planting Windows

The single annual contract cycle is replaced by four planting windows, each triggered by when crops actually need to go in the ground. Each window has its own needs projection, Farmers pool review, and advance payment cycle.

| Window | Negotiation opens | Advance paid | Crops covered | Typical delivery |
|---|---|---|---|---|
| `fall` | July | August | Winter wheat, rye, garlic, fall brassicas, cover crops | June–July (following year) |
| `spring` | January | February | Early greens, peas, spinach, cool-season vegetables | April–June |
| `main` | February | March–April | Summer row crops, dry beans, corn, tomatoes, squash | August–October |
| `perennial` | October | November | Orchards, berry crops, asparagus, ongoing perennial maintenance | Ongoing per crop |

A `plantingWindow` value takes the form `"fall-2026"`, `"spring-2027"`, `"main-2027"` — window name plus the year the crop goes in the ground (not the year it's harvested, which may differ for fall-planted crops).

A single farm may hold contracts in multiple windows simultaneously — a wheat contract in `fall-2026` and a bean contract in `main-2026` are independent contracts with independent terms, advances, and settlements.

---

## Approval Flow

1. **Needs projection published** — Food domain publishes a projection for the upcoming window: what crops the community is willing to buy, up to what volumes, at what indicative price. Triggers the offer period for that window.
2. **Farm submits an offer** — a crop plan entry (or entries) against specific line items in the projection, stating how many lbs they can grow, at what acreage, and on what payment terms. A farm can offer against one line item or many. Offers can be submitted by a farm operator who is a community member, or drafted by a Farmers pool member on behalf of a non-member farm.
3. **Farmers pool reviews** — evaluates offers against coverage needs (which crops are under-covered, which are full), negotiates payment terms, recommends acceptance or amendment. May solicit additional offers from other farms if coverage is insufficient.
4. **Assembly motion** — contract terms presented to the full assembly. Approved by simple majority.
5. **Advance payment** — issued within 7 days of approval. Triggers status → `active`.
6. **Growing season** — periodic inspections; community labor and equipment delivered per resource commitments.
7. **Harvest delivery** — farm delivers against schedule; intake recorded by Food Security steward.
8. **Settlement** — Farmers pool reconciles deliveries against contract terms; final payment issued; surplus distributed.

---

## Cross-Community Contracts

A community may contract with a farm registered in another community's territory. The governance structure:

- The farm remains governed by its **home community** — practice standards, inspections, and dispute resolution are the home community's responsibility
- The **contracting community** is the buyer — it sets the crop plan, payment terms, and delivery expectations
- Payment flows directly to the farm's bank account (kin transfer via federation bank routing)
- The home community receives a **stewardship fee** (community-defined percentage of contract value) in exchange for providing governance oversight
- Disputes escalate to the **federation** if the two communities cannot resolve them bilaterally

Cross-community contracts require a federation-level motion in addition to the contracting community's assembly motion.

---

## Needs Projection

Before each planting window opens, the Food domain publishes a **needs projection** — the community's public signal of what it is willing to contract for that season. It is not a demand; it is an offer to buy, up to stated limits.

**Fields:**
- `id: string`
- `plantingWindow: PlantingWindow` — e.g. `"fall-2026"`, `"main-2027"`
- `memberHeadcount: number` — snapshot at projection date
- `reserveTargetWeeks: number` — e.g. 8
- `cropNeeds: CropNeedEntry[]` — per-crop willingness-to-contract entries (see above)
- `publishedAt: string`
- `approvedByMotionId: string | null`

The projection is public. Farm associations read it and decide which line items they can sensibly offer against, and at what volume. A single farm may offer against one crop or many. Multiple farms may each offer against the same crop — the Grange aggregates their offers to track total coverage.

**Coverage tracking:** For each `CropNeedEntry`, the Grange computes:
- **Committed lbs** — sum of `estimatedYieldLbs` across all approved or active contracts for that crop need entry
- **Coverage pct** — committed lbs / maxContractLbs
- **Status** — `uncovered` (<minDesiredLbs), `minimum-met` (≥min, <max), `full` (≥max)

This is displayed on the Grange dashboard so the Farmers pool can see which crops still need offers and which have enough coverage to close the window.

The Food domain maintains a **rolling projection horizon** — at any given time, projections for the next two upcoming windows should already exist in draft or approved form. This ensures farms can plan ahead and the community is never surprised by a planting window that opens without a corresponding needs statement.

---

## Farmer Pool

The Farmers pool is the governance body that manages the contract system. Unlike most pools, it has a mixed membership: community members with farming knowledge or interest, **and** farm operators from contracted farm associations (even if the operators are not full community members).

Farm operators on the Farmers pool have standing to participate in contract negotiation and practice standard discussions, but not in motions that affect broader community governance. This is the explicit concession that farm operators are partners in the food system, not just vendors.

---

## Roles

- **Farmers Pool Member** — can review contracts, conduct inspections, recommend approval
- **Farm Operator** — can submit contract proposals, record deliveries, view their own contracts
- **Food Security Steward** — records intake deliveries, maintains reserve inventory
- **Treasurer** — executes payment transfers at advance, milestone, and settlement stages

---

## Port & Infrastructure

- Runs as `packages/grange`
- Port `3005`
- SQLite database: `grange.db`
- Tables: `farm_associations`, `contracts`, `deliveries`, `inspections`, `needs_projections`
- Auth: same `requirePersonCredential` pattern as other satellite apps
- Config endpoint returns: `communityUrl`, `bankUrl`, `atheneumUrl`, `grangeUrl`
