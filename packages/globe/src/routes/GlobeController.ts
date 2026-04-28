import { type Request, type Response } from "express";
import { NodeSigner, NodeService } from "@ecf/core";
import { GlobeApplicationService } from "../GlobeApplicationService.js";
import { GlobeMemberService } from "../GlobeMemberService.js";
import { GlobeClearingHouse } from "../domains/central_bank/GlobeClearingHouse.js";
import { GlobeTreasury } from "../domains/treasury/GlobeTreasury.js";
import { GlobeConstitution } from "../governance/GlobeConstitution.js";
import { BankClient } from "../BankClient.js";

const BANK_URL = process.env.BANK_URL ?? "http://localhost:3031";

function bank(): BankClient {
    return new BankClient(
        BANK_URL,
        body => NodeService.getInstance().getSigner().signBody(body),
    );
}

// ── Applications ──────────────────────────────────────────────────────────────

/**
 * POST /api/applications
 * Body: { commonwealthName, commonwealthHandle, commonwealthNodeId, commonwealthPublicKey, populationCount }
 * Auth: x-node-signature signed with the commonwealth's own private key
 */
export async function submitApplication(req: Request, res: Response): Promise<void> {
    const { commonwealthName, commonwealthHandle, commonwealthNodeId, commonwealthPublicKey, commonwealthUrl, commonwealthEntityId, commonwealthPriority, populationCount } = req.body ?? {};

    if (typeof commonwealthName      !== "string" || !commonwealthName.trim()) {
        res.status(400).json({ error: "commonwealthName is required" }); return;
    }
    if (typeof commonwealthHandle !== "string" || !commonwealthHandle.trim()) {
        res.status(400).json({ error: "commonwealthHandle is required" }); return;
    }
    const handle = commonwealthHandle.toLowerCase().trim();
    if (!/^[a-z0-9][a-z0-9-]{0,30}[a-z0-9]$|^[a-z0-9]{1,2}$/.test(handle)) {
        res.status(400).json({ error: "commonwealthHandle must be 2–32 characters: lowercase letters, digits, hyphens" }); return;
    }
    if (typeof commonwealthNodeId    !== "string" || !commonwealthNodeId.trim()) {
        res.status(400).json({ error: "commonwealthNodeId is required" }); return;
    }
    if (typeof commonwealthPublicKey !== "string" || !commonwealthPublicKey.trim()) {
        res.status(400).json({ error: "commonwealthPublicKey is required" }); return;
    }
    if (typeof commonwealthUrl !== "string" || !commonwealthUrl.trim()) {
        res.status(400).json({ error: "commonwealthUrl is required" }); return;
    }
    if (typeof commonwealthEntityId !== "string" || !commonwealthEntityId.trim()) {
        res.status(400).json({ error: "commonwealthEntityId is required" }); return;
    }

    const signature = req.headers["x-node-signature"];
    const rawBody   = (req as Request & { rawBody?: string }).rawBody;
    if (typeof signature !== "string" || !rawBody) {
        res.status(401).json({ error: "Missing x-node-signature header" }); return;
    }
    if (!NodeSigner.verify(rawBody, signature, commonwealthPublicKey)) {
        res.status(401).json({ error: "Signature verification failed" }); return;
    }

    try {
        const count    = typeof populationCount === "number" && populationCount > 0 ? Math.floor(populationCount) : 0;
        const priority = typeof commonwealthPriority === "number" && commonwealthPriority > 0 ? Math.floor(commonwealthPriority) : 1;
        const app = GlobeApplicationService.getInstance().submit(
            commonwealthName.trim(),
            handle,
            commonwealthNodeId.trim(),
            commonwealthPublicKey.trim(),
            commonwealthUrl.trim(),
            commonwealthEntityId.trim(),
            count,
            priority,
        );
        console.log(`[globe] application submitted: ${commonwealthName} (${handle})`);
        res.status(201).json(appToDto(app));
    } catch (err) {
        res.status(409).json({ error: (err as Error).message });
    }
}

export function listApplications(_req: Request, res: Response): void {
    res.json(GlobeApplicationService.getInstance().getAll().map(appToDto));
}

export function getApplication(req: Request, res: Response): void {
    const app = GlobeApplicationService.getInstance().getById(String(req.params.id ?? ""));
    if (!app) { res.status(404).json({ error: "Not found" }); return; }
    res.json(appToDto(app));
}

export function getApplicationByNodeId(req: Request, res: Response): void {
    const app = GlobeApplicationService.getInstance().getByNodeId(String(req.params.nodeId ?? ""));
    if (!app) { res.status(404).json({ error: "Not found" }); return; }
    res.json(appToDto(app));
}

/**
 * PATCH /api/applications/:id
 * Approving a commonwealth opens a kin clearing account and sets the credit line.
 */
export async function reviewApplication(req: Request, res: Response): Promise<void> {
    const { status, reviewNote } = req.body ?? {};

    if (!["approved", "rejected", "under_review"].includes(status)) {
        res.status(400).json({ error: "status must be approved, rejected, or under_review" }); return;
    }

    const appSvc    = GlobeApplicationService.getInstance();
    const memberSvc = GlobeMemberService.getInstance();
    const app       = appSvc.getById(String(req.params.id ?? ""));

    if (!app) { res.status(404).json({ error: "Application not found" }); return; }
    if (app.status === "approved") { res.status(409).json({ error: "Application already approved" }); return; }

    if (status === "approved") {
        // Create member record first
        let member;
        try {
            member = memberSvc.add(
                app.commonwealthName,
                app.commonwealthHandle,
                app.commonwealthNodeId,
                app.commonwealthPublicKey,
                app.commonwealthUrl,
                app.commonwealthEntityId,
                false,
                app.commonwealthPriority,
            );
        } catch (err) {
            res.status(409).json({ error: (err as Error).message }); return;
        }

        // Open clearing account — roll back member record if bank fails
        try {
            const b = bank();
            await b.createOwner("institution", app.commonwealthName, { ownerId: member.id });
            const account = await b.openAccount(member.id, `${app.commonwealthName} Clearing Account`, "kithe");
            memberSvc.setBankAccount(member.id, account.accountId);
        } catch (err) {
            memberSvc.remove(member.id);
            console.error("[globe/approve] bank error, rolling back:", err);
            res.status(502).json({ error: "Failed to open globe bank account" }); return;
        }

        const constitution  = GlobeConstitution.getInstance();
        const creditLineKin = app.populationCount * constitution.creditLineKinPerPerson;
        memberSvc.setCreditLine(member.id, creditLineKin);
        memberSvc.setPopulation(member.id, app.populationCount);

        const updated = appSvc.advance(app.id, "approved", reviewNote ?? null, member.id);
        console.log(
            `[globe] approved: ${app.commonwealthName} — ` +
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
    res.json(GlobeMemberService.getInstance().getAll().map(memberToDto));
}

export async function getEconomics(_req: Request, res: Response): Promise<void> {
    const ch       = GlobeClearingHouse.getInstance();
    const treasury = GlobeTreasury.getInstance();

    if (!ch.isReady() || !treasury.isReady()) {
        res.json({ ready: false, clearing: null });
        return;
    }

    const constitution = GlobeConstitution.getInstance();
    const members      = GlobeMemberService.getInstance().getAll();
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
            clearingFeeRate:        constitution.clearingFeeRate,
            creditLineKinPerPerson: constitution.creditLineKinPerPerson,
            treasuryBalance:        treasuryAccount?.amount ?? 0,
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

    const memberSvc = GlobeMemberService.getInstance();
    const sender    = memberSvc.getById(authReq.memberId);
    const recipient = memberSvc.getById(toMemberId);

    if (!sender?.bankAccountId) {
        res.status(404).json({ error: "Sender has no clearing account" }); return;
    }
    if (!recipient?.bankAccountId) {
        res.status(404).json({ error: "Recipient not found or has no clearing account" }); return;
    }

    const ch           = GlobeClearingHouse.getInstance();
    const treasury     = GlobeTreasury.getInstance();
    const constitution = GlobeConstitution.getInstance();

    if (!ch.isReady()) {
        res.status(503).json({ error: "Globe clearing house not ready" }); return;
    }

    try {
        const b             = bank();
        const senderAccount = await b.getAccountById(sender.bankAccountId);
        const senderBalance = senderAccount?.amount ?? 0;
        const isMutualAid   = mutualAid === true;

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

// ── Structural (catastrophic / planetary) aid grant ──────────────────────────

export async function structuralAidGrant(req: Request, res: Response): Promise<void> {
    const { memberId, amount, memo } = req.body ?? {};

    if (typeof memberId !== "string") {
        res.status(400).json({ error: "memberId is required" }); return;
    }
    if (typeof amount !== "number" || amount <= 0) {
        res.status(400).json({ error: "amount must be a positive number" }); return;
    }

    const member = GlobeMemberService.getInstance().getById(memberId);
    if (!member?.bankAccountId) {
        res.status(404).json({ error: "Member not found or has no clearing account" }); return;
    }

    const ch = GlobeClearingHouse.getInstance();
    if (!ch.isReady()) {
        res.status(503).json({ error: "Globe clearing house not ready" }); return;
    }

    try {
        await ch.structuralAidGrant(
            member.bankAccountId,
            amount,
            typeof memo === "string" ? memo : `planetary aid grant to ${member.name}`,
        );
        res.status(204).end();
    } catch (err) {
        res.status(422).json({ error: (err as Error).message });
    }
}

// ── Treasury + Constitution ───────────────────────────────────────────────────

export async function getTreasury(_req: Request, res: Response): Promise<void> {
    const treasury = GlobeTreasury.getInstance();
    if (!treasury.isReady()) { res.json({ ready: false }); return; }
    const b            = bank();
    const account      = await b.getAccountById(treasury.accountId);
    const balance      = account?.amount ?? 0;
    const constitution = GlobeConstitution.getInstance();
    res.json({ ready: true, balance, budget: constitution.budget(balance) });
}

export function getConstitution(_req: Request, res: Response): void {
    res.json(GlobeConstitution.getInstance().toJSON());
}

// ── DTOs ──────────────────────────────────────────────────────────────────────

function appToDto(app: ReturnType<typeof GlobeApplicationService.prototype.getById>) {
    if (!app) return null;
    return {
        id:                   app.id,
        commonwealthName:     app.commonwealthName,
        commonwealthHandle:   app.commonwealthHandle,
        commonwealthNodeId:   app.commonwealthNodeId,
        status:               app.status,
        submittedAt:          app.submittedAt,
        reviewedAt:           app.reviewedAt,
        reviewNote:           app.reviewNote,
        memberId:             app.memberId,
        populationCount:      app.populationCount,
    };
}

function memberToDto(m: ReturnType<typeof GlobeMemberService.prototype.getById>) {
    if (!m) return null;
    return {
        id:                    m.id,
        name:                  m.name,
        handle:                m.handle,
        commonwealthNodeId:    m.commonwealthNodeId,
        joinedAt:              m.joinedAt,
        isFounder:             m.isFounder,
        bankAccountId:         m.bankAccountId,
        creditLineKin:         m.creditLineKin,
        populationCount:       m.populationCount,
    };
}

// ── Payment routing ───────────────────────────────────────────────────────────

/**
 * POST /api/route-payment
 * Body: { address: { commonwealth, federation, community }, token, amount, fromAccountId }
 *
 * Entry point for directed payments. The globe strips the commonwealth segment,
 * looks up the target commonwealth by handle, moves kin inside the globe bank,
 * then forwards the full address to the commonwealth's /api/route-payment.
 *
 * `fromAccountId` is the payer's globe clearing account (or the globe treasury
 * account for grants). External institutions that don't have a globe account
 * should first transfer kin to a gateway account, then call this endpoint.
 */
export async function routePayment(req: Request, res: Response): Promise<void> {
    const { address, token, amount, fromAccountId } = req.body ?? {};

    if (typeof address?.commonwealth !== "string" || !address.commonwealth) {
        res.status(400).json({ error: "address.commonwealth is required" }); return;
    }
    if (typeof address?.federation !== "string" || !address.federation) {
        res.status(400).json({ error: "address.federation is required" }); return;
    }
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

    const nodes  = GlobeMemberService.getInstance().getAllByHandle(address.commonwealth);
    const member = nodes.find(n => n.bankAccountId != null) ?? nodes[0];
    if (!member) {
        res.status(404).json({ error: `No commonwealth with handle "${address.commonwealth}"` }); return;
    }
    if (!member.bankAccountId) {
        res.status(422).json({ error: `Commonwealth "${address.commonwealth}" has no clearing account` }); return;
    }

    // Move kin: sender's globe clearing account → commonwealth's globe clearing account
    try {
        await bank().transfer(
            fromAccountId,
            member.bankAccountId,
            amount,
            `directed payment → ${address.commonwealth}:${address.federation}:${address.community} (token ${token.slice(0, 8)}…)`,
        );
    } catch (err) {
        res.status(502).json({ error: `Bank transfer failed: ${(err as Error).message}` }); return;
    }

    // Forward to the commonwealth
    try {
        const body = JSON.stringify({ address, token, amount, fromAccountId: member.bankAccountId });
        const node = NodeService.getInstance();
        const sig  = node.getSigner().signBody(body);
        const cwRes = await fetch(`${member.url.replace(/\/$/, "")}/api/route-payment`, {
            method:  "POST",
            headers: {
                "Content-Type":     "application/json",
                "x-node-id":        node.getIdentity().id,
                "x-node-signature": sig,
            },
            body,
        });
        if (!cwRes.ok) {
            const err = await cwRes.json().catch(() => ({})) as { error?: string };
            console.warn(
                `[globe/route-payment] commonwealth ${address.commonwealth} returned ${cwRes.status}: ` +
                `${err.error ?? "unknown"}`,
            );
        }
    } catch (err) {
        console.warn(`[globe/route-payment] could not forward to commonwealth: ${(err as Error).message}`);
    }

    res.json({
        ok:           true,
        commonwealth: address.commonwealth,
        federation:   address.federation,
        community:    address.community,
        amount,
    });
}
