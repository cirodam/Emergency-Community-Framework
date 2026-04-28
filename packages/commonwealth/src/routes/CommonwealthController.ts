import { type Request, type Response } from "express";
import { NodeSigner, BankClient, NodeService, sendMessage, type EcfMessage } from "@ecf/core";
import { CommonwealthApplicationService } from "../CommonwealthApplicationService.js";
import { CommonwealthMemberService } from "../CommonwealthMemberService.js";
import { CommonwealthClearingHouse } from "../domains/central_bank/CommonwealthClearingHouse.js";
import { CommonwealthTreasury } from "../domains/treasury/CommonwealthTreasury.js";
import { CommonwealthConstitution } from "../governance/CommonwealthConstitution.js";
import { GlobeMembershipService } from "../GlobeMembershipService.js";

const BANK_URL = process.env.BANK_URL ?? "http://localhost:3021";

function bank(): BankClient {
    return new BankClient(
        BANK_URL,
        body => NodeService.getInstance().getSigner().signBody(body),
        "kithe",
    );
}

// ── Applications ──────────────────────────────────────────────────────────────

/**
 * POST /api/applications
 * Body: { federationName, federationHandle, federationNodeId, federationPublicKey, populationCount }
 * Auth: x-node-signature signed with the federation's own private key
 */
export async function submitApplication(req: Request, res: Response): Promise<void> {
    const { federationName, federationHandle, federationNodeId, federationPublicKey, federationUrl, federationEntityId, federationPriority, populationCount } = req.body ?? {};

    if (typeof federationName      !== "string" || !federationName.trim()) {
        res.status(400).json({ error: "federationName is required" }); return;
    }
    if (typeof federationHandle !== "string" || !federationHandle.trim()) {
        res.status(400).json({ error: "federationHandle is required" }); return;
    }
    const handle = federationHandle.toLowerCase().trim();
    if (!/^[a-z0-9][a-z0-9-]{0,30}[a-z0-9]$|^[a-z0-9]{1,2}$/.test(handle)) {
        res.status(400).json({ error: "federationHandle must be 2–32 characters: lowercase letters, digits, hyphens" }); return;
    }
    if (typeof federationNodeId    !== "string" || !federationNodeId.trim()) {
        res.status(400).json({ error: "federationNodeId is required" }); return;
    }
    if (typeof federationPublicKey !== "string" || !federationPublicKey.trim()) {
        res.status(400).json({ error: "federationPublicKey is required" }); return;
    }
    if (typeof federationUrl !== "string" || !federationUrl.trim()) {
        res.status(400).json({ error: "federationUrl is required" }); return;
    }
    if (typeof federationEntityId !== "string" || !federationEntityId.trim()) {
        res.status(400).json({ error: "federationEntityId is required" }); return;
    }

    const signature = req.headers["x-node-signature"];
    const rawBody   = (req as Request & { rawBody?: string }).rawBody;
    if (typeof signature !== "string" || !rawBody) {
        res.status(401).json({ error: "Missing x-node-signature header" }); return;
    }
    if (!NodeSigner.verify(rawBody, signature, federationPublicKey)) {
        res.status(401).json({ error: "Signature verification failed" }); return;
    }

    try {
        const count    = typeof populationCount === "number" && populationCount > 0 ? Math.floor(populationCount) : 0;
        const priority = typeof federationPriority === "number" && federationPriority > 0 ? Math.floor(federationPriority) : 1;
        const app = CommonwealthApplicationService.getInstance().submit(
            federationName.trim(),
            handle,
            federationNodeId.trim(),
            federationPublicKey.trim(),
            federationUrl.trim(),
            federationEntityId.trim(),
            count,
            priority,
        );
        console.log(`[commonwealth] application submitted: ${federationName} (${handle})`);
        res.status(201).json(appToDto(app));
    } catch (err) {
        res.status(409).json({ error: (err as Error).message });
    }
}

export function listApplications(_req: Request, res: Response): void {
    res.json(CommonwealthApplicationService.getInstance().getAll().map(appToDto));
}

export function getApplication(req: Request, res: Response): void {
    const app = CommonwealthApplicationService.getInstance().getById(String(req.params.id ?? ""));
    if (!app) { res.status(404).json({ error: "Not found" }); return; }
    res.json(appToDto(app));
}

export function getApplicationByNodeId(req: Request, res: Response): void {
    const app = CommonwealthApplicationService.getInstance().getByNodeId(String(req.params.nodeId ?? ""));
    if (!app) { res.status(404).json({ error: "Not found" }); return; }
    res.json(appToDto(app));
}

/**
 * PATCH /api/applications/:id
 * Body: { status, reviewNote }
 * Approving a federation opens a kin clearing account and sets the credit line.
 */
export async function reviewApplication(req: Request, res: Response): Promise<void> {
    const { status, reviewNote } = req.body ?? {};

    if (!["approved", "rejected", "under_review"].includes(status)) {
        res.status(400).json({ error: "status must be approved, rejected, or under_review" }); return;
    }

    const appSvc    = CommonwealthApplicationService.getInstance();
    const memberSvc = CommonwealthMemberService.getInstance();
    const app       = appSvc.getById(String(req.params.id ?? ""));

    if (!app) { res.status(404).json({ error: "Application not found" }); return; }
    if (app.status === "approved") { res.status(409).json({ error: "Application already approved" }); return; }

    if (status === "approved") {
        // Create member record first
        let member;
        try {
            member = memberSvc.add(
                app.federationName,
                app.federationHandle,
                app.federationNodeId,
                app.federationPublicKey,
                app.federationUrl,
                app.federationEntityId,
                false,
                app.federationPriority,
            );
        } catch (err) {
            res.status(409).json({ error: (err as Error).message }); return;
        }

        // Open clearing account — roll back member record if bank fails
        try {
            const b = bank();
            await b.createOwner("institution", app.federationName, { ownerId: member.id });
            const account = await b.openAccount(member.id, `${app.federationName} Clearing Account`, "kithe");
            memberSvc.setBankAccount(member.id, account.accountId);
        } catch (err) {
            memberSvc.remove(member.id);
            console.error("[commonwealth/approve] bank error, rolling back:", err);
            res.status(502).json({ error: "Failed to open commonwealth bank account" }); return;
        }

        const constitution  = CommonwealthConstitution.getInstance();
        const creditLineKin = app.populationCount * constitution.creditLineKinPerPerson;
        memberSvc.setCreditLine(member.id, creditLineKin);
        memberSvc.setPopulation(member.id, app.populationCount);

        const updated = appSvc.advance(app.id, "approved", reviewNote ?? null, member.id);
        console.log(
            `[commonwealth] approved: ${app.federationName} — ` +
            `credit line ${creditLineKin} kin (${app.populationCount} population)`,
        );
        res.json(appToDto(updated));
    } else {
        try {
            const updated = appSvc.advance(app.id, status, reviewNote ?? null);
            res.json(appToDto(updated));
        } catch (err) {
            res.status(422).json({ error: (err as Error).message });
        }
    }
}

// ── Members + Economics ───────────────────────────────────────────────────────

export function listMembers(_req: Request, res: Response): void {
    res.json(CommonwealthMemberService.getInstance().getAll().map(memberToDto));
}

export async function getEconomics(_req: Request, res: Response): Promise<void> {
    const ch      = CommonwealthClearingHouse.getInstance();
    const treasury = CommonwealthTreasury.getInstance();

    if (!ch.isReady() || !treasury.isReady()) {
        res.json({ ready: false, clearing: null });
        return;
    }

    const constitution = CommonwealthConstitution.getInstance();
    const members      = CommonwealthMemberService.getInstance().getAll();
    const b            = bank();

    const [kinInClearing, treasuryAccount] = await Promise.all([
        ch.kinInClearing(),
        b.getAccountById(treasury.accountId),
    ]);

    const balances = await Promise.all(
        members.map(async m => {
            if (!m.bankAccountId) return { ...memberToDto(m), balance: null };
            const acc = await b.getAccountById(m.bankAccountId);
            return { ...memberToDto(m), balance: acc?.amount ?? null };
        }),
    );

    res.json({
        ready: true,
        clearing: {
            kinInClearing,
            clearingFeeRate:       constitution.clearingFeeRate,
            creditLineKinPerPerson: constitution.creditLineKinPerPerson,
            treasuryBalance:       treasuryAccount?.amount ?? 0,
        },
        members: balances,
    });
}

// ── Transfers ─────────────────────────────────────────────────────────────────

export async function transferKin(req: Request, res: Response): Promise<void> {
    const authReq   = req as Request & { memberId: string };
    const { toMemberId, amount, memo, mutualAid } = req.body ?? {};

    if (typeof toMemberId !== "string") {
        res.status(400).json({ error: "toMemberId is required" }); return;
    }
    if (typeof amount !== "number" || amount <= 0) {
        res.status(400).json({ error: "amount must be a positive number" }); return;
    }

    const memberSvc = CommonwealthMemberService.getInstance();
    const sender    = memberSvc.getById(authReq.memberId);
    const recipient = memberSvc.getById(toMemberId);

    if (!sender?.bankAccountId) {
        res.status(404).json({ error: "Sender has no clearing account" }); return;
    }
    if (!recipient?.bankAccountId) {
        res.status(404).json({ error: "Recipient not found or has no clearing account" }); return;
    }

    const ch         = CommonwealthClearingHouse.getInstance();
    const treasury   = CommonwealthTreasury.getInstance();
    const constitution = CommonwealthConstitution.getInstance();

    if (!ch.isReady()) {
        res.status(503).json({ error: "Commonwealth clearing house not ready" }); return;
    }

    try {
        const b              = bank();
        const senderAccount  = await b.getAccountById(sender.bankAccountId);
        const senderBalance  = senderAccount?.amount ?? 0;
        const isMutualAid    = mutualAid === true;

        const { fee } = await ch.transfer(
            sender.bankAccountId,
            recipient.bankAccountId,
            amount,
            typeof memo === "string" ? memo : `transfer: ${sender.name} → ${recipient.name}`,
            constitution.clearingFeeRate,
            treasury.accountId,
            sender.creditLineKin,
            senderBalance,
            isMutualAid,
        );

        res.json({ ok: true, fee });
    } catch (err) {
        res.status(422).json({ error: (err as Error).message });
    }
}

// ── Structural (catastrophic) aid grant ──────────────────────────────────────

export async function structuralAidGrant(req: Request, res: Response): Promise<void> {
    const { memberId, amount, memo } = req.body ?? {};

    if (typeof memberId !== "string") {
        res.status(400).json({ error: "memberId is required" }); return;
    }
    if (typeof amount !== "number" || amount <= 0) {
        res.status(400).json({ error: "amount must be a positive number" }); return;
    }

    const member = CommonwealthMemberService.getInstance().getById(memberId);
    if (!member?.bankAccountId) {
        res.status(404).json({ error: "Member not found or has no clearing account" }); return;
    }

    const ch = CommonwealthClearingHouse.getInstance();
    if (!ch.isReady()) {
        res.status(503).json({ error: "Commonwealth clearing house not ready" }); return;
    }

    try {
        await ch.structuralAidGrant(
            member.bankAccountId,
            amount,
            typeof memo === "string" ? memo : `catastrophic aid grant to ${member.name}`,
        );
        res.status(204).end();
    } catch (err) {
        res.status(422).json({ error: (err as Error).message });
    }
}

// ── Treasury + Constitution ───────────────────────────────────────────────────

export async function getTreasury(_req: Request, res: Response): Promise<void> {
    const treasury = CommonwealthTreasury.getInstance();
    if (!treasury.isReady()) { res.json({ ready: false }); return; }
    const b       = bank();
    const account = await b.getAccountById(treasury.accountId);
    const balance = account?.amount ?? 0;
    const constitution = CommonwealthConstitution.getInstance();
    res.json({ ready: true, balance, budget: constitution.budget(balance) });
}

export function getConstitution(_req: Request, res: Response): void {
    res.json(CommonwealthConstitution.getInstance().toJSON());
}

// ── DTOs ──────────────────────────────────────────────────────────────────────

function appToDto(app: ReturnType<typeof CommonwealthApplicationService.prototype.getById>) {
    if (!app) return null;
    return {
        id:                  app.id,
        federationName:      app.federationName,
        federationHandle:    app.federationHandle,
        federationNodeId:    app.federationNodeId,
        status:              app.status,
        submittedAt:         app.submittedAt,
        reviewedAt:          app.reviewedAt,
        reviewNote:          app.reviewNote,
        memberId:            app.memberId,
        populationCount:     app.populationCount,
    };
}

function memberToDto(m: ReturnType<typeof CommonwealthMemberService.prototype.getById>) {
    if (!m) return null;
    return {
        id:               m.id,
        name:             m.name,
        handle:           m.handle,
        federationNodeId: m.federationNodeId,
        joinedAt:         m.joinedAt,
        isFounder:        m.isFounder,
        bankAccountId:    m.bankAccountId,
        creditLineKin:    m.creditLineKin,
        populationCount:  m.populationCount,
    };
}

// ── Payment routing ───────────────────────────────────────────────────────────

// ── EcfMessage handler ────────────────────────────────────────────────────────

interface TransferRouteBody {
    address: { community: string; federation: string; commonwealth?: string; globe?: string };
    toAccountId: string;
    amount: number;
    fromAccountId?: string;
    memo?: string;
}

/**
 * MessageDispatcher handler for "bank.transfer.route" at the commonwealth tier.
 * Mirrors the logic of `routePayment` but invoked via EcfMessage (sync semantics).
 *
 * Cross-commonwealth: forwards to globe via EcfMessage.
 * Local delivery: moves kithe to target federation's clearing account,
 *   then sends "bank.transfer.route" onward to the federation.
 */
export async function handleBankTransferRoute(
    msg: EcfMessage<TransferRouteBody>,
): Promise<{ ok: boolean; federation: string; community: string; amount: number }> {
    const { address, toAccountId, amount, fromAccountId, memo } = msg.body ?? {};

    if (typeof address?.federation !== "string" || !address.federation) throw new Error("address.federation is required");
    if (typeof address?.community  !== "string" || !address.community)  throw new Error("address.community is required");
    if (typeof toAccountId !== "string" || !toAccountId)               throw new Error("toAccountId is required");
    if (typeof amount !== "number" || amount <= 0)                      throw new Error("amount must be a positive number");

    const node = NodeService.getInstance();

    // ── Cross-commonwealth: forward to globe ──────────────────────────────────
    const globeRecord    = GlobeMembershipService.getInstance().getStatus();
    const thisCwHandle   = globeRecord?.commonwealthHandle ?? null;
    const targetCwHandle = typeof address.commonwealth === "string" ? address.commonwealth : null;

    if (targetCwHandle && thisCwHandle && targetCwHandle !== thisCwHandle) {
        if (!globeRecord || globeRecord.status !== "approved") throw new Error("Commonwealth is not a globe member — cannot route cross-commonwealth");
        if (!globeRecord.globeAccountId)                       throw new Error("Commonwealth has no globe clearing account");

        await sendMessage<TransferRouteBody>(
            globeRecord.globeUrl,
            "bank",
            "bank.transfer.route",
            { address, toAccountId, amount, fromAccountId: globeRecord.globeAccountId, memo },
            node.getSigner(),
            node.getIdentity().id,
            node.getIdentity().address,
        );

        return { ok: true, federation: address.federation, community: address.community, amount };
    }

    // ── Local delivery: route to the target federation ─────────────────────────
    const nodes  = CommonwealthMemberService.getInstance().getAllByHandle(address.federation);
    const member = nodes.find(n => n.bankAccountId != null) ?? nodes[0];
    if (!member)               throw new Error(`No federation with handle "${address.federation}"`);
    if (!member.bankAccountId) throw new Error(`Federation "${address.federation}" has no clearing account`);

    if (typeof fromAccountId === "string" && fromAccountId) {
        await bank().transfer(
            fromAccountId,
            member.bankAccountId,
            amount,
            typeof memo === "string" ? memo : `directed payment → ${address.federation}:${address.community}`,
        );
    }

    await sendMessage<TransferRouteBody>(
        member.url,
        "bank",
        "bank.transfer.route",
        { address, toAccountId, amount, fromAccountId: member.bankAccountId, memo },
        node.getSigner(),
        node.getIdentity().id,
        node.getIdentity().address,
    );

    return { ok: true, federation: address.federation, community: address.community, amount };
}
