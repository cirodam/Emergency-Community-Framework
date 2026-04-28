import { Request, Response } from "express";
import { CentralBank } from "../domains/central_bank/CentralBank.js";
import { SocialInsuranceBank } from "../domains/social_insurance/SocialInsuranceBank.js";
import { CommunityTreasury } from "../domains/community_treasury/CommunityTreasury.js";
import { Constitution } from "../governance/Constitution.js";
import { DomainService } from "../DomainService.js";
import { nodeBankClient as bankClient } from "../nodeBankClient.js";

/**
 * GET /api/budget — public transparency endpoint.
 *
 * Returns the community's full budget:
 *   inflow  — treasury balance + estimated monthly dues
 *   outflow — sum of every domain's payroll + budget line items
 *   solvency — whether monthly inflow covers monthly outflow
 */
export async function getCommunityBudget(_req: Request, res: Response): Promise<void> {
    const cb       = CentralBank.getInstance();
    const treasury = CommunityTreasury.getInstance();
    const constitution = Constitution.getInstance();

    if (!cb.isReady() || !treasury.isReady()) {
        res.json({ ready: false });
        return;
    }

    try {
        const bank = bankClient();
        const si = SocialInsuranceBank.getInstance();

        const [cbAccount, treasuryAccount, siAccount] = await Promise.all([
            bank.getAccountById(cb.issuanceAccountId),
            bank.getAccountById(treasury.accountId),
            si.isReady() ? bank.getAccountById(si.poolAccountId) : Promise.resolve(null),
        ]);

        const kinInCirculation    = cbAccount ? Math.max(0, -cbAccount.amount) : 0;
        const duesRate            = constitution.communityDuesRate;
        const treasuryBalance     = treasuryAccount?.amount ?? 0;
        const siPoolBalance       = siAccount?.amount ?? 0;
        const duesableKin         = Math.max(0, kinInCirculation - siPoolBalance - treasuryBalance);
        const estimatedMonthlyDues = Math.round(duesableKin * duesRate * 100) / 100;

        const domainBudget   = DomainService.getInstance().getCommunityBudget();
        const monthlyOutflow = domainBudget.totals.total;
        const solvent        = estimatedMonthlyDues >= monthlyOutflow;

        res.json({
            ready: true,
            inflow: {
                treasuryBalance,
                duesRate,
                estimatedMonthlyDues,
                kinInCirculation,
            },
            outflow: {
                monthlyTotal: monthlyOutflow,
                domains:      domainBudget.domains,
                totals:       domainBudget.totals,
            },
            solvent,
        });
    } catch (err) {
        res.status(502).json({ ready: false, error: "Bank unavailable" });
    }
}
