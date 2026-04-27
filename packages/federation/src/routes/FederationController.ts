import { type Request, type Response } from "express";
import { NodeSigner } from "@ecf/core";
import { FederationApplicationService } from "../FederationApplicationService.js";
import { FederationMemberService } from "../FederationMemberService.js";
import { FederationCentralBank } from "../domains/central_bank/FederationCentralBank.js";
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
    const { communityName, communityHandle, communityNodeId, communityPublicKey } = req.body ?? {};

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
        const app = FederationApplicationService.getInstance().submit(
            communityName.trim(),
            handle,
            communityNodeId.trim(),
            communityPublicKey.trim(),
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
 *   2. Opens a kithe account at the federation bank for the Currency Board
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
            member = memberSvc.add(app.communityName, app.communityHandle, app.communityNodeId, app.communityPublicKey);
        } catch (err) {
            res.status(409).json({ error: (err as Error).message }); return;
        }

        // Open kithe account for the community's Currency Board at the federation bank
        try {
            const b = bank();
            await b.createOwner("institution", app.communityName, { ownerId: member.id });
            const account = await b.openAccount(member.id, `${app.communityName} Currency Board`, "kithe");
            memberSvc.setBankAccount(member.id, account.accountId);
        } catch (err) {
            memberSvc.remove(member.id);
            console.error("[federation/approve] bank error, rolling back:", err);
            res.status(502).json({ error: "Failed to open federation bank account" }); return;
        }

        const updated = appSvc.advance(id, "approved", reviewNote ?? null, member.id);
        console.log(`[federation] approved: ${app.communityName}`);
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
    const cb = FederationCentralBank.getInstance();
    if (!cb.isReady()) {
        res.status(503).json({ error: "Federation central bank not ready" }); return;
    }

    const kitheInCirculation = await cb.kitheInCirculation();
    const members = FederationMemberService.getInstance().getAll();
    const b = bank();

    const memberBalances = await Promise.all(
        members
            .filter(m => m.bankAccountId)
            .map(async m => {
                const account = await b.getAccountById(m.bankAccountId!);
                return { name: m.name, balance: account?.amount ?? 0 };
            }),
    );

    res.json({
        kitheInCirculation,
        memberCount: members.length,
        members: memberBalances,
    });
}

// ── Transfers (between member communities via their Currency Boards) ───────────

/**
 * POST /api/transfers
 * Auth: x-node-signature from a registered member community (verified via registry)
 * Body: { toMemberId, amount, memo? }
 */
export async function transferKithe(
    req: Request & { communityId?: string },
    res: Response,
): Promise<void> {
    const { toMemberId, amount, memo } = req.body ?? {};
    const fromMemberId = req.communityId;

    if (!fromMemberId) { res.status(401).json({ error: "Not authenticated" }); return; }
    if (typeof toMemberId !== "string") {
        res.status(400).json({ error: "toMemberId is required" }); return;
    }
    if (typeof amount !== "number" || amount <= 0) {
        res.status(400).json({ error: "amount must be a positive number" }); return;
    }

    const svc  = FederationMemberService.getInstance();
    const from = svc.getById(fromMemberId);
    const to   = svc.getById(toMemberId);

    if (!from?.bankAccountId) { res.status(422).json({ error: "Sender has no bank account" }); return; }
    if (!to?.bankAccountId)   { res.status(404).json({ error: "Recipient member not found" }); return; }

    try {
        await bank().transfer(
            from.bankAccountId,
            to.bankAccountId,
            amount,
            typeof memo === "string" ? memo : `kithe transfer: ${from.name} → ${to.name}`,
        );
        res.status(204).end();
    } catch (err) {
        res.status(422).json({ error: (err as Error).message });
    }
}

// ── Issue kithe (federation operator) ────────────────────────────────────────

/**
 * POST /api/kithe/issue
 * Auth: requireMemberCommunity (federation operator self-sign)
 * Body: { memberId, amount, memo? }
 */
export async function issueKithe(req: Request, res: Response): Promise<void> {
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

    try {
        await FederationCentralBank.getInstance().issue(
            amount,
            member.bankAccountId,
            typeof memo === "string" ? memo : `kithe issuance to ${member.name}`,
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
