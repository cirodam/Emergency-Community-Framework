import { BaseDemurrageScheduler } from "@ecf/core";
import { CommonwealthClearingHouse } from "./domains/central_bank/CommonwealthClearingHouse.js";
import { CommonwealthTreasury } from "./domains/treasury/CommonwealthTreasury.js";
import { CommonwealthConstitution } from "./governance/CommonwealthConstitution.js";
import { CommonwealthMemberService } from "./CommonwealthMemberService.js";

/**
 * Monthly demurrage sweep for the commonwealth clearing layer.
 *
 * Mirrors FederationDemurrageScheduler exactly, one level up:
 * charges federations (not communities) whose commonwealth clearing account
 * balance exceeds (creditLineKin × surplusThresholdMultiple), then immediately
 * redistributes the solidarity pool to federations in deficit.
 */
export class CommonwealthDemurrageScheduler extends BaseDemurrageScheduler {
    protected readonly logTag = "CommonwealthDemurrageScheduler";

    protected async _sweep(monthKey: string): Promise<void> {
        const ch = CommonwealthClearingHouse.getInstance();
        if (!ch.isReady()) {
            console.warn("[CommonwealthDemurrageScheduler] clearing house not ready, skipping sweep");
            return;
        }

        const treasury = CommonwealthTreasury.getInstance();
        if (!treasury.isReady()) {
            console.warn("[CommonwealthDemurrageScheduler] treasury not ready, skipping sweep");
            return;
        }

        const constitution = CommonwealthConstitution.getInstance();
        const members      = CommonwealthMemberService.getInstance().getAll();

        console.log(`[CommonwealthDemurrageScheduler] running demurrage sweep for ${monthKey}`);

        const sweepResults = await ch.sweepDemurrage(
            members,
            constitution.surplusThresholdMultiple,
            constitution.surplusDemurrageRate,
            constitution.solidarityPoolFraction,
            treasury.accountId,
        );

        if (sweepResults.length === 0) {
            console.log("[CommonwealthDemurrageScheduler] no federations above surplus threshold");
        }

        console.log(`[CommonwealthDemurrageScheduler] running solidarity redistribution for ${monthKey}`);
        const redistResults = await ch.redistributeSolidarity(members);

        if (redistResults.length === 0) {
            console.log("[CommonwealthDemurrageScheduler] no federations in deficit, solidarity pool retained");
        }
    }
}
