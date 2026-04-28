import { type Request, type Response } from "express";
import { NodeSigner } from "@ecf/core";
import { FederationApplicationService } from "../FederationApplicationService.js";
import { FederationMemberService } from "../FederationMemberService.js";
import { FederationClearingHouse } from "../domains/central_bank/FederationClearingHouse.js";
import { FederationTreasury } from "../domains/treasury/FederationTreasury.js";
import { FederationConstitution } from "../governance/FederationConstitution.js";
import { FederationDomainService } from "../common/FederationDomainService.js";
import { BankClient } from "../BankClient.js";
import { NodeService } from "@ecf/core";
import { FederationCensusService } from "../census/FederationCensusService.js";

const BANK_URL = process.env.BANK_URL ?? "http://localhost:3011";

function bank(): BankClient {
    return new BankClient(
        BANK_URL,
        body => NodeService.getInstance().getSigner().signBody(body),
    );
}

// ── Applications ──────────────────────────────────────────────────────────────

/**
 * POST /api/applications
 * Body: { communityName, communityNodeId, communityPublicKey }
 * Auth: x-node-signature signed with the community's own private key
 *       (verified against communityPublicKey in the body — proves key ownership)
 *
 * The community is not a member yet, so we can't look up its key from the
 * member registry. Instead we verify the signature using the key it presents,
 * proving it controls the private key.
 */
export async function submitApplication(req: Request, res: Response): Promise<void> {
    const { communityName, communityHandle, communityNodeId, communityPublicKey, communityUrl, communityEntityId, communityPriority, memberCount } = req.body ?? {};

    if (typeof communityName      !== "string" || !communityName.trim()) {
        res.status(400).json({ error: "communityName is required" }); return;
    }
    if (typeof communityHandle !== "string" || !communityHandle.trim()) {
        res.status(400).json({ error: "communityHandle is required" }); return;
    }
    const handle = communityHandle.toLowerCase().trim();
    if (!/^[a-z0-9][a-z0-9-]{0,30}[a-z0-9]$|^[a-z0-9]{1,2}$/.test(handle)) {
        res.status(400).json({ error: "communityHandle must be 2–32 characters: lowercase letters, digits, hyphens (no leading/trailing hyphens)" }); return;
    }
    if (typeof communityNodeId    !== "string" || !communityNodeId.trim()) {
        res.status(400).json({ error: "communityNodeId is required" }); return;
    }
    if (typeof communityPublicKey !== "string" || !communityPublicKey.trim()) {
        res.status(400).json({ error: "communityPublicKey is required" }); return;
    }
    if (typeof communityUrl !== "string" || !communityUrl.trim()) {
        res.status(400).json({ error: "communityUrl is required" }); return;
    }
    if (typeof communityEntityId !== "string" || !communityEntityId.trim()) {
        res.status(400).json({ error: "communityEntityId is required" }); return;
    }

    // Verify signature using the presented public key
    const signature = req.headers["x-node-signature"];
    const rawBody   = (req as Request & { rawBody?: string }).rawBody;
    if (typeof signature !== "string" || !rawBody) {
        res.status(401).json({ error: "Missing x-node-signature header" }); return;
    }
    if (!NodeSigner.verify(rawBody, signature, communityPublicKey)) {
        res.status(401).json({ error: "Signature verification failed" }); return;
    }

    try {
        const count = typeof memberCount === "number" && memberCount > 0 ? Math.floor(memberCount) : 0;
        const priority = typeof communityPriority === "number" && communityPriority > 0 ? Math.floor(communityPriority) : 1;
        const app = FederationApplicationService.getInstance().submit(
            communityName.trim(),
            handle,
            communityNodeId.trim(),
            communityPublicKey.trim(),
            communityUrl.trim(),
            communityEntityId.trim(),
            count,
            priority,
        );
        console.log(`[federation] application submitted: ${communityName} (${handle}, ${communityNodeId})`);
        res.status(201).json(appToDto(app));
    } catch (err) {
        res.status(409).json({ error: (err as Error).message });
    }
}

/** GET /api/applications — list all (federation operator view) */
export function listApplications(_req: Request, res: Response): void {
    res.json(FederationApplicationService.getInstance().getAll().map(appToDto));
}

/** GET /api/applications/:id — fetch one (community polls this to track status) */
export function getApplication(req: Request, res: Response): void {
    const app = FederationApplicationService.getInstance().getById(req.params.id as string);
    if (!app) { res.status(404).json({ error: "Application not found" }); return; }
    res.json(appToDto(app));
}

/** GET /api/applications/by-node/:nodeId — community polls by its own node ID */
export function getApplicationByNodeId(req: Request, res: Response): void {
    const app = FederationApplicationService.getInstance().getByNodeId(req.params.nodeId as string);
    if (!app) { res.status(404).json({ error: "No application for this community" }); return; }
    res.json(appToDto(app));
}

/**
 * PATCH /api/applications/:id
 * Body: { status: "under_review" | "approved" | "rejected", reviewNote? }
 *
 * Federation operator action. On "approved":
 *   1. Creates a FederationMember record
     * 2. Opens a kin clearing account at the federation bank for the community
 *   3. Links the member ID back onto the application
 */
export async function reviewApplication(req: Request, res: Response): Promise<void> {
    const { status, reviewNote } = req.body ?? {};
    const id = req.params.id as string;

    if (status !== "under_review" && status !== "approved" && status !== "rejected") {
        res.status(400).json({ error: "status must be under_review, approved, or rejected" }); return;
    }

    const appSvc = FederationApplicationService.getInstance();
    const app = appSvc.getById(id);
    if (!app) { res.status(404).json({ error: "Application not found" }); return; }

    if (status === "approved") {
        // Create member record
        const memberSvc = FederationMemberService.getInstance();
        let member;
        try {
            member = memberSvc.add(app.communityName, app.communityHandle, app.communityNodeId, app.communityPublicKey, app.communityUrl, app.communityEntityId, false, app.communityPriority);
        } catch (err) {
            res.status(409).json({ error: (err as Error).message }); return;
        }

        // Open kin clearing account for the community at the federation bank
        try {
            const b = bank();
            await b.createOwner("institution", app.communityName, { ownerId: member.id });
            const account = await b.openAccount(member.id, `${app.communityName} Clearing Account`, "kithe");
            memberSvc.setBankAccount(member.id, account.accountId);
        } catch (err) {
            memberSvc.remove(member.id);
            console.error("[federation/approve] bank error, rolling back:", err);
            res.status(502).json({ error: "Failed to open federation bank account" }); return;
        }

        // Set credit line based on member count and constitutional rate
        const constitution = FederationConstitution.getInstance();
        const creditLineKin = (app.memberCount ?? 0) * constitution.creditLineKinPerPerson;
        memberSvc.setCreditLine(member.id, creditLineKin);

        const updated = appSvc.advance(id, "approved", reviewNote ?? null, member.id);
        console.log(`[federation] approved: ${app.communityName} — credit line: ${creditLineKin} kin`);
        res.json(appToDto(updated));
        return;
    }

    try {
        const updated = appSvc.advance(id, status, reviewNote ?? null);
        res.json(appToDto(updated));
    } catch (err) {
        res.status(422).json({ error: (err as Error).message });
    }
}

// ── Members ───────────────────────────────────────────────────────────────────

export function listMembers(_req: Request, res: Response): void {
    res.json(FederationMemberService.getInstance().getAll().map(memberToDto));
}

// ── Economics ─────────────────────────────────────────────────────────────────

export async function getEconomics(_req: Request, res: Response): Promise<void> {
    const ch = FederationClearingHouse.getInstance();
    if (!ch.isReady()) {
        res.status(503).json({ error: "Federation clearing house not ready" }); return;
    }

    const members = FederationMemberService.getInstance().getAll();
    const b = bank();

    const memberBalances = await Promise.all(
        members
            .filter(m => m.bankAccountId)
            .map(async m => {
                const account = await b.getAccountById(m.bankAccountId!);
                return {
                    name:          m.name,
                    balance:       account?.amount ?? 0,
                    creditLineKin: m.creditLineKin,
                };
            }),
    );

    const kinInClearing = await ch.kinInClearing();

    res.json({
        kinInClearing,
        memberCount: members.length,
        members: memberBalances,
        clearingFeeRate:        FederationConstitution.getInstance().clearingFeeRate,
        creditLineKinPerPerson: FederationConstitution.getInstance().creditLineKinPerPerson,
    });
}

// ── Transfers (between member communities) ───────────────────────────────────

/**
 * POST /api/transfers
 * Auth: x-node-signature from a registered member community (verified via registry)
 * Body: { toMemberId, amount, memo?, mutualAid?: boolean, solidarity?: boolean }
 *
 * mutualAid=true:  fee exempt, credit line on sender not checked.
 *                  For emergency assistance — the receiver is in crisis.
 *
 * solidarity=true: fee exempt, credit line still checked (sender stays solvent).
 *                  For intentional investment in a less-wealthy community.
 *                  Wealthy communities use this to voluntarily move surplus kin
 *                  rather than wait for demurrage to do it automatically.
 */
export async function transferKithe(
    req: Request & { communityId?: string },
    res: Response,
): Promise<void> {
    const { toMemberId, amount, memo, mutualAid, solidarity } = req.body ?? {};
    const fromMemberId = req.communityId;

    if (!fromMemberId) { res.status(401).json({ error: "Not authenticated" }); return; }
    if (typeof toMemberId !== "string") {
        res.status(400).json({ error: "toMemberId is required" }); return;
    }
    if (typeof amount !== "number" || amount <= 0) {
        res.status(400).json({ error: "amount must be a positive number" }); return;
    }
    if (mutualAid === true && solidarity === true) {
        res.status(400).json({ error: "mutualAid and solidarity are mutually exclusive" }); return;
    }

    const svc  = FederationMemberService.getInstance();
    const from = svc.getById(fromMemberId);
    const to   = svc.getById(toMemberId);

    if (!from?.bankAccountId) { res.status(422).json({ error: "Sender has no bank account" }); return; }
    if (!to?.bankAccountId)   { res.status(404).json({ error: "Recipient member not found" }); return; }

    const treasury = FederationTreasury.getInstance();
    if (!treasury.isReady()) {
        res.status(503).json({ error: "Federation treasury not ready" }); return;
    }

    const ch = FederationClearingHouse.getInstance();
    if (!ch.isReady()) {
        res.status(503).json({ error: "Federation clearing house not ready" }); return;
    }

    try {
        const b = bank();
        const senderAccount = await b.getAccountById(from.bankAccountId);
        if (!senderAccount) { res.status(422).json({ error: "Sender account not found" }); return; }

        const constitution  = FederationConstitution.getInstance();
        const isMutualAid   = mutualAid === true;
        const isSolidarity  = solidarity === true;
        // Both mutualAid and solidarity are fee-exempt; only mutualAid skips the credit line check
        const feeExempt     = isMutualAid || isSolidarity;

        const transferMemo = typeof memo === "string" ? memo
            : isMutualAid
                ? `mutual aid: ${from.name} → ${to.name}`
                : isSolidarity
                    ? `solidarity investment: ${from.name} → ${to.name}`
                    : `kin transfer: ${from.name} → ${to.name}`;

        const { fee } = await ch.transfer(
            from.bankAccountId,
            to.bankAccountId,
            amount,
            transferMemo,
            feeExempt ? 0 : constitution.clearingFeeRate,
            treasury.accountId,
            from.creditLineKin,
            senderAccount.amount,
            isMutualAid, // only mutualAid bypasses credit line check
        );

        res.json({ transferred: amount - fee, fee, mutualAid: isMutualAid, solidarity: isSolidarity });
    } catch (err) {
        res.status(422).json({ error: (err as Error).message });
    }
}

// ── Structural aid grant (federation assembly only) ───────────────────────────

/**
 * POST /api/kithe/structural-aid
 * Auth: requireMemberCommunity (federation operator self-sign)
 * Body: { memberId, amount, memo? }
 *
 * Issues kin from the clearing house structural-aid account (overdraft = -Infinity)
 * to a member community. Requires explicit assembly authorisation in practice;
 * this route enforces node-level auth only — governance enforcement is out-of-band.
 */
export async function structuralAidGrant(req: Request, res: Response): Promise<void> {
    const { memberId, amount, memo } = req.body ?? {};

    if (typeof memberId !== "string") {
        res.status(400).json({ error: "memberId is required" }); return;
    }
    if (typeof amount !== "number" || amount <= 0) {
        res.status(400).json({ error: "amount must be a positive number" }); return;
    }

    const member = FederationMemberService.getInstance().getById(memberId);
    if (!member?.bankAccountId) {
        res.status(404).json({ error: "Member not found or has no bank account" }); return;
    }

    const ch = FederationClearingHouse.getInstance();
    if (!ch.isReady()) {
        res.status(503).json({ error: "Federation clearing house not ready" }); return;
    }

    try {
        await ch.structuralAidGrant(
            member.bankAccountId,
            amount,
            typeof memo === "string" ? memo : `structural aid grant to ${member.name}`,
        );
        res.status(204).end();
    } catch (err) {
        res.status(422).json({ error: (err as Error).message });
    }
}

// ── DTOs ──────────────────────────────────────────────────────────────────────

function appToDto(app: ReturnType<typeof FederationApplicationService.prototype.getById>) {
    if (!app) return null;
    return {
        id:              app.id,
        communityName:   app.communityName,
        communityNodeId: app.communityNodeId,
        status:          app.status,
        submittedAt:     app.submittedAt,
        reviewedAt:      app.reviewedAt,
        reviewNote:      app.reviewNote,
        memberId:        app.memberId,
        memberCount:     app.memberCount,
    };
}

function memberToDto(m: ReturnType<typeof FederationMemberService.prototype.getById>) {
    if (!m) return null;
    return {
        id:              m.id,
        name:            m.name,
        communityNodeId: m.communityNodeId,
        joinedAt:        m.joinedAt,
        bankAccountId:   m.bankAccountId,
        creditLineKin:   m.creditLineKin,
    };
}

// ── Federation Treasury ───────────────────────────────────────────────────────

/** GET /api/treasury — current balance and account info */
export async function getTreasury(_req: Request, res: Response): Promise<void> {
    const treasury = FederationTreasury.getInstance();
    if (!treasury.isReady()) {
        res.status(503).json({ error: "Federation treasury not ready" }); return;
    }
    try {
        const balance = await treasury.balance();
        res.json({ accountId: treasury.accountId, balance });
    } catch (err) {
        res.status(502).json({ error: (err as Error).message });
    }
}

// ── Federation Constitution ───────────────────────────────────────────────────

/** GET /api/constitution — all federation governance parameters */
export function getConstitution(_req: Request, res: Response): void {
    res.json(FederationConstitution.getInstance().toJSON());
}

/** GET /api/budget — computed budget allocation for current treasury balance */
export async function getBudget(_req: Request, res: Response): Promise<void> {
    const treasury = FederationTreasury.getInstance();
    if (!treasury.isReady()) {
        res.status(503).json({ error: "Federation treasury not ready" }); return;
    }
    try {
        const balance = await treasury.balance();
        const allocation = FederationConstitution.getInstance().budget(balance);
        res.json({ treasuryBalance: balance, allocation });
    } catch (err) {
        res.status(502).json({ error: (err as Error).message });
    }
}

// ── Federation Domains ────────────────────────────────────────────────────────

/** GET /api/domains — list all registered federation functional domains */
export function listDomains(_req: Request, res: Response): void {
    const domains = FederationDomainService.getInstance().getDomains().map(d => ({
        id:          d.id,
        name:        d.name,
        description: d.description,
    }));
    res.json(domains);
}

// ── Census ────────────────────────────────────────────────────────────────────

type AuthedRequest = Request & { communityId: string; communityNodeId: string };

/**
 * POST /api/census
 * Auth: requireMemberCommunity (x-node-id + x-node-signature)
 * Body: { memberCount: number, nullifiers: string[] }
 *
 * The community submits a pseudonymous census. The federation stores it and
 * returns any nullifiers that appear in other communities' censuses.
 */
export function submitCensus(req: Request, res: Response): void {
    const { communityId } = req as AuthedRequest;
    const { memberCount, nullifiers } = req.body ?? {};

    if (typeof memberCount !== "number" || memberCount < 0) {
        res.status(400).json({ error: "memberCount must be a non-negative number" }); return;
    }
    if (!Array.isArray(nullifiers) || nullifiers.some(n => typeof n !== "string")) {
        res.status(400).json({ error: "nullifiers must be an array of strings" }); return;
    }
    if (nullifiers.length !== memberCount) {
        res.status(400).json({ error: "nullifiers.length must equal memberCount" }); return;
    }

    const result = FederationCensusService.getInstance().submit(communityId, memberCount, nullifiers);
    res.json(result);
}

/** GET /api/census — public summary of unique members across all communities. */
export function getCensusSummary(_req: Request, res: Response): void {
    res.json(FederationCensusService.getInstance().getSummary());
}

// ── Payment routing ───────────────────────────────────────────────────────────

/**
 * POST /api/route-payment
 * Body: { address: { commonwealth, federation, community }, token, amount, fromAccountId }
 *
 * Called by the clearing layer (or directly by a commonwealth) when a directed
 * payment arrives for a community in this federation. The federation:
 *   1. Looks up the target community by handle.
 *   2. Transfers `amount` from the sender's clearing account to the community's
 *      clearing account (internal bank move — no fee).
 *   3. Forwards the routing request to the community's /api/payment-tokens/receive
 *      so the community can apply the payment to the correct person.
 *
 * Auth: requireMemberCommunity (or direct from upper layer) — for now open since
 * this is an internal infrastructure call; production should add node-sig auth.
 */
export async function routePayment(req: Request, res: Response): Promise<void> {
    const { address, token, amount, fromAccountId } = req.body ?? {};

    if (typeof address?.community !== "string" || !address.community) {
        res.status(400).json({ error: "address.community is required" }); return;
    }
    if (typeof token !== "string" || !token) {
        res.status(400).json({ error: "token is required" }); return;
    }
    if (typeof amount !== "number" || amount <= 0) {
        res.status(400).json({ error: "amount must be a positive number" }); return;
    }
    if (typeof fromAccountId !== "string" || !fromAccountId) {
        res.status(400).json({ error: "fromAccountId is required" }); return;
    }

    const nodes = FederationMemberService.getInstance().getAllByHandle(address.community);
    const member = nodes.find(n => n.bankAccountId != null) ?? nodes[0];
    if (!member) {
        res.status(404).json({ error: `No community with handle "${address.community}"` }); return;
    }
    if (!member.bankAccountId) {
        res.status(422).json({ error: `Community "${address.community}" has no clearing account` }); return;
    }

    // Move kin inside the federation bank: sender's clearing account → community's clearing account
    try {
        const b = bank();
        await b.transfer(
            fromAccountId,
            member.bankAccountId,
            amount,
            `directed payment → ${address.community} (token ${token.slice(0, 8)}…)`,
        );
    } catch (err) {
        res.status(502).json({ error: `Bank transfer failed: ${(err as Error).message}` }); return;
    }

    // Forward to the community node to resolve the token and credit the person
    try {
        const body = JSON.stringify({ address, token, amount });
        const node = NodeService.getInstance();
        const sig  = node.getSigner().signBody(body);
        const communityRes = await fetch(`${member.url.replace(/\/$/, "")}/api/payment-tokens/receive`, {
            method:  "POST",
            headers: {
                "Content-Type":     "application/json",
                "x-node-id":        node.getIdentity().id,
                "x-node-signature": sig,
            },
            body,
        });
        if (!communityRes.ok) {
            const err = await communityRes.json().catch(() => ({})) as { error?: string };
            // Non-fatal for routing — the bank transfer succeeded; community can reconcile
            console.warn(
                `[federation/route-payment] community ${address.community} returned ${communityRes.status}: ` +
                `${err.error ?? "unknown"}`,
            );
        }
    } catch (err) {
        console.warn(`[federation/route-payment] could not forward to community: ${(err as Error).message}`);
    }

    res.json({ ok: true, community: address.community, amount });
}
