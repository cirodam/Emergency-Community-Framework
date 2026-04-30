import { BaseDemurrageScheduler } from "@ecf/core";
import { FederationClearingHouse } from "./domains/central_bank/FederationClearingHouse.js";
import { FederationTreasury } from "./domains/treasury/FederationTreasury.js";
import { FederationConstitution } from "./governance/FederationConstitution.js";
import { FederationMemberService } from "./FederationMemberService.js";

/**
 * Monthly demurrage sweep.
 *
 * Runs on the 1st of each month (UTC).  Collects a holding charge from any
 * community whose federation account balance exceeds:
 *
 *   threshold = creditLineKin × surplusThresholdMultiple
 *
 * Only the portion above the threshold is charged at surplusDemurrageRate.
 * Proceeds flow to the federation treasury.
 *
 * Design intent: kin that sits idle above a reasonable cushion should be put
 * to work — invested locally, lent to neighbours, or spent on real goods.
 * The charge is mild enough that a community earning a healthy surplus is
 * never punished; only indefinite hoarding is discouraged.
 */
export class FederationDemurrageScheduler extends BaseDemurrageScheduler {
    protected readonly logTag = "FederationDemurrageScheduler";

    protected async _sweep(monthKey: string): Promise<void> {
        const ch = FederationClearingHouse.getInstance();
        if (!ch.isReady()) {
            console.warn("[FederationDemurrageScheduler] clearing house not ready, skipping sweep");
            return;
        }

        const treasury = FederationTreasury.getInstance();
        if (!treasury.isReady()) {
            console.warn("[FederationDemurrageScheduler] treasury not ready, skipping sweep");
            return;
        }

        const constitution = FederationConstitution.getInstance();
        const members      = FederationMemberService.getInstance().getAll();

        console.log(`[FederationDemurrageScheduler] running demurrage sweep for ${monthKey}`);

        const sweepResults = await ch.sweepDemurrage(
            members,
            constitution.surplusThresholdMultiple,
            constitution.surplusDemurrageRate,
            constitution.solidarityPoolFraction,
            treasury.accountId,
        );

        if (sweepResults.length === 0) {
            console.log("[FederationDemurrageScheduler] no communities above surplus threshold");
        }

        // Redistribute whatever accumulated in the solidarity pool to deficit communities
        console.log(`[FederationDemurrageScheduler] running solidarity redistribution for ${monthKey}`);
        const redistResults = await ch.redistributeSolidarity(members);

        if (redistResults.length === 0) {
            console.log("[FederationDemurrageScheduler] no communities in deficit, solidarity pool retained");
        }
    }
}
