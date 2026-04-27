import { Request, Response } from "express";
import { CentralBank } from "../domains/central_bank/CentralBank.js";
import { CurrencyBoard } from "../domains/currency_board/CurrencyBoard.js";
import { SocialInsuranceBank } from "../domains/social_insurance/SocialInsuranceBank.js";
import { CommunityTreasury } from "../domains/community_treasury/CommunityTreasury.js";
import { BankClient } from "../BankClient.js";
import { FederationMembershipService } from "../FederationMembershipService.js";
import { Constitution } from "../governance/Constitution.js";
import { DomainService } from "../DomainService.js";
import { PersonService } from "../person/PersonService.js";

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

    const constitution = Constitution.getInstance();
    const persons      = PersonService.getInstance().getAll();
    const now          = new Date();
    const workingMin   = constitution.workingAgeMin;
    const retireAge    = constitution.retirementAge;

    let children = 0, workingAge = 0, retired = 0, disabled = 0;
    for (const p of persons) {
        const age = p.getAgeYears(now);
        if (p.disabled) { disabled++; continue; }
        if (p.retired || age >= retireAge) { retired++; continue; }
        if (age < workingMin) { children++; } else { workingAge++; }
    }
    const total = persons.length;

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
        demographics: {
            total,
            workingAge,
            children,
            retired,
            disabled,
            workingAgeMin:  workingMin,
            retirementAge:  retireAge,
        },
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

// ── Community budget ─────────────────────────────────────────────────────────

/**
 * GET /api/budget — public transparency endpoint.
 *
 * Returns the community's full budget:
 *   inflow  — treasury balance + estimated monthly levy
 *   outflow — sum of every domain's payroll + budget line items
 *   solvency — whether monthly inflow covers monthly outflow
 *
 * The community levy moves kin from member accounts into the treasury
 * (the spending pool). Central-bank demurrage retires kin and is NOT
 * counted here since it doesn't flow to the treasury.
 */
export async function getCommunityBudget(_req: Request, res: Response): Promise<void> {
    const cb       = CentralBank.getInstance();
    const treasury = CommunityTreasury.getInstance();
    const constitution = Constitution.getInstance();

    if (!cb.isReady() || !treasury.isReady()) {
        res.json({ ready: false });
        return;
    }

    const bank = new BankClient(BANK_URL);

    const [cbAccount, treasuryAccount] = await Promise.all([
        bank.getAccountById(cb.issuanceAccountId),
        bank.getAccountById(treasury.accountId),
    ]);

    // kinInCirculation = −(issuance account balance) since it starts at 0
    // and goes negative as kin is issued.
    const kinInCirculation = cbAccount ? Math.max(0, -cbAccount.amount) : 0;
    const levyRate         = constitution.communityLevyRate;
    const treasuryBalance  = treasuryAccount?.amount ?? 0;

    // Estimated monthly inflow = levy on all circulating kin
    // (conservative: levy is applied per-account above the floor; this is
    //  the theoretical upper bound since the floor exempts small balances)
    const estimatedMonthlyLevy = Math.round(kinInCirculation * levyRate * 100) / 100;

    const domainBudget = DomainService.getInstance().getCommunityBudget();

    const monthlyOutflow = domainBudget.totals.total;
    const solvent        = estimatedMonthlyLevy >= monthlyOutflow;

    res.json({
        ready: true,
        inflow: {
            treasuryBalance,
            levyRate,
            estimatedMonthlyLevy,
            kinInCirculation,
        },
        outflow: {
            monthlyTotal: monthlyOutflow,
            domains:      domainBudget.domains,
            totals:       domainBudget.totals,
        },
        solvent,
    });
}
