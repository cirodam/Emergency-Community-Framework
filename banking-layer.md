# Banking Layer

## Core Principle

The bank is pure infrastructure. It has no interest in who its account holders are — members, communities, federations, scheduled processes — all are equal. It moves value between accounts, records transactions, and enforces overdraft limits. Nothing more.

Policy — demurrage, endowments, payroll, mint/burn — is the responsibility of external processes that hold authorized accounts at the bank. The bank executes instructions; it does not originate them.

---

## What the Bank Does

- Open and close accounts
- Transfer value between accounts
- Enforce overdraft limits (per-account, governance-set)
- Record every transaction immutably
- Return account balances and transaction history

## What the Bank Does Not Do

- Know what a member, community, or referendum is
- Run monetary policy
- Mint or burn currency
- Make decisions about whether a transfer should happen
- Distinguish between account holder types

---

## Accounts

Every account has:
- A unique ID
- An owner ID (opaque string — the bank does not resolve this to any entity)
- A label (e.g. `"primary"`, `"escrow"`, `"reserve"`)
- A balance
- An overdraft limit (minimum allowed balance; default 0; `-Infinity` for accounts that may go negative, e.g. the central bank issuing account)
- A demurrage exemption flag (set by governance at account creation)

Any actor — a member, a community node, a central bank process, a currency board — opens an account at the bank the same way. The bank does not care.

---

## Transfers

All value movement goes through `transfer(fromAccountId, toAccountId, amount, memo)`. There is no direct balance mutation — no credits or debits outside of a transfer.

Rules enforced at transfer time:
- Amount must be a finite positive number
- Both accounts must exist
- The debit must not push the source account below its overdraft limit

If any rule is violated, the transfer is rejected and nothing is recorded.

Balances are rounded to 2 decimal places on every operation to prevent floating-point drift.

---

## Authorized Callers

The bank exposes an API. Any process that holds a valid service credential (issued by the community's heart node) may call it. The bank verifies the credential and executes the instruction — it does not second-guess the caller's intent.

Callers and what they do:

| Caller | What they do at the bank |
|---|---|
| Community container | Opens member accounts on enrollment; closes on departure |
| Central bank process | Periodic demurrage sweep; endowment credits; social insurance payroll |
| Currency board | Mint (credit reserve account) / burn (debit reserve account) on cross-community transfers |
| Marketplace | Escrow debits and credits on purchases |
| Member (via community API) | Initiates peer-to-peer transfers |

The bank sees all of these as authorized callers making transfer requests. It does not have separate code paths for each.

---

## Currency

The bank is parameterized by currency — currently `"kin"` for community banks, `"kithe"` for federation banks. Currency is a label on the account and transaction record. The bank's logic is identical in both cases.

This is what allows the same bank codebase to serve both community nodes (kin) and federation nodes (kithe) without modification. The bank does not know or care which currency it's holding — that meaning lives in the governance layer above it.

---

## Cross-Community Transfers

When value needs to move between communities, the bank is not involved in the coordination — that is the currency board's responsibility. From the bank's perspective, a cross-community transfer is two ordinary local operations:

**Community A bank:**
1. Debit John's account (prepare)
2. Debit reserve account (commit, on currency board instruction)

**Federal bank:**
1. Debit Community A's kithe account
2. Credit Community B's kithe account

**Community B bank:**
1. Credit reserve account (on currency board instruction)
2. Credit Bill's account (commit)

The bank at each step sees only a local transfer between two accounts. The two-phase commit protocol and idempotency are enforced by the currency board and federation bank coordination layer — not by any individual bank instance.

---

## Two-Phase Commit

For operations that must be atomic across multiple steps (cross-community transfers, marketplace escrow), the bank supports a prepare/commit/rollback protocol:

- `prepare` — reserves the debit/credit; balance is held but not finalized
- `commit` — finalizes the prepared operation
- `rollback` — releases the reservation; balance reverts

Uncommitted prepares expire after a timeout (default 60 seconds) and roll back automatically. This prevents stuck reservations from network failures.

---

## Deployment

The same bank container runs at both the community and federation level. Configuration determines:
- Which currency label is used (`kin` or `kithe`)
- Which heart node issued its ownership certificate
- Which processes are authorized callers

No code changes are needed to deploy a federation bank vs. a community bank.

**Collocated (small community):**
```
host machine
├── community-container   (governance, currency board, frontend)
└── bank-container        (accounts, transactions)
```

**Distributed (larger community):**
```
machine A                       machine B
└── community-container         └── bank-container
```

**Federation:**
```
federation host
├── federation-container   (federation governance)
└── bank-container         (kithe accounts for affiliated communities)
```

---

## File Layout

```
src/bank/
  Bank.ts               — Core ledger: accounts, transfers, transaction history
  BankAccount.ts        — Account record and balance management
  BankTransaction.ts    — Immutable transaction record
  AccountLoader.ts      — Disk persistence for accounts
  TransactionLoader.ts  — Disk persistence for transactions

src/central_bank/
  CentralBank.ts        — Demurrage, endowments, social insurance (caller of Bank)
  MemberEndowmentLoader.ts

src/http/routes/
  bankRoutes.ts         — HTTP API for bank operations
  centralBankRoutes.ts  — HTTP API for monetary policy operations
```
