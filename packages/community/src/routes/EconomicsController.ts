import { Request, Response } from "express";
import { CentralBank } from "../domains/central_bank/CentralBank.js";
import { CurrencyBoard } from "../domains/currency_board/CurrencyBoard.js";
import { SocialInsuranceBank } from "../domains/social_insurance/SocialInsuranceBank.js";
import { BankClient } from "../BankClient.js";
import { FederationMembershipService } from "../FederationMembershipService.js";

const BANK_URL = process.env.BANK_URL ?? "http://localhost:3001";

// GET /api/economics — public, no auth required.
// Returns live monetary data: kin/kithe in circulation and SI pool stats.
// Returns { ready: false } when the bank is unreachable.
export async function getEconomics(_req: Request, res: Response): Promise<void> {
    const cb      = CentralBank.getInstance();
    const curBoard = CurrencyBoard.getInstance();
    const si       = SocialInsuranceBank.getInstance();

    if (!cb.isReady()) {
        res.json({ ready: false, centralBank: null, currencyBoard: null, socialInsurance: null });
        return;
    }

    const bank = new BankClient(BANK_URL);

    const [cbAccount, curBoardAccount, siAccount] = await Promise.all([
        bank.getAccountById(cb.issuanceAccountId),
        curBoard.isReady() ? bank.getAccountById(curBoard.issuanceAccountId) : Promise.resolve(null),
        si.isReady()       ? bank.getAccountById(si.poolAccountId)           : Promise.resolve(null),
    ]);

    res.json({
        ready: true,
        centralBank: {
            kinInCirculation:  cbAccount ? Math.max(0, -cbAccount.amount) : 0,
        },
        currencyBoard: curBoard.isReady() ? {
            kitheInCirculation: curBoardAccount ? Math.max(0, -curBoardAccount.amount) : 0,
        } : null,
        socialInsurance: si.isReady() ? {
            poolBalance:       siAccount?.amount ?? 0,
            totalContributed:  si.getTotalPoolContributed(),
            totalPaidOut:      si.getTotalPaidOut(),
            memberCount:       si.getMemberCount(),
        } : null,
    });
}

// ── Federation membership ──────────────────────────────────────────────────

/** GET /api/federation — return current federation membership state */
export async function getFederationStatus(_req: Request, res: Response): Promise<void> {
    const svc = FederationMembershipService.getInstance();
    res.json(svc.getStatus() ?? { status: "none" });
}

/** POST /api/federation/apply — submit an application to join a federation */
export async function applyToFederation(req: Request, res: Response): Promise<void> {
    const { federationUrl, communityName } = req.body as {
        federationUrl?: string;
        communityName?: string;
    };
    if (!federationUrl || !communityName) {
        res.status(400).json({ error: "federationUrl and communityName are required" });
        return;
    }

    try {
        const membership = await FederationMembershipService.getInstance().apply(federationUrl, communityName);
        res.status(201).json(membership);
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        res.status(400).json({ error: msg });
    }
}

/** GET /api/federation/sync — poll the federation and refresh local state */
export async function syncFederationStatus(_req: Request, res: Response): Promise<void> {
    const membership = await FederationMembershipService.getInstance().sync();
    res.json(membership ?? { status: "none" });
}
