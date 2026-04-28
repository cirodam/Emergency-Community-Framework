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
export class CommonwealthDemurrageScheduler {
    private timer: ReturnType<typeof setInterval> | null = null;

    start(): void {
        this._runIfDue().catch(err =>
            console.error("[CommonwealthDemurrageScheduler] startup check failed:", err),
        );

        this.timer = setInterval(() => {
            this._runIfDue().catch(err =>
                console.error("[CommonwealthDemurrageScheduler] sweep failed:", err),
            );
        }, 60 * 60 * 1_000);
    }

    stop(): void {
        if (this.timer) { clearInterval(this.timer); this.timer = null; }
    }

    private _lastRunMonth: string | null = null;

    private async _runIfDue(): Promise<void> {
        const now = new Date();
        if (now.getUTCDate() !== 1) return;

        const monthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
        if (this._lastRunMonth === monthKey) return;
        this._lastRunMonth = monthKey;

        await this._sweep(monthKey);
    }

    private async _sweep(monthKey: string): Promise<void> {
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
