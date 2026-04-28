import { GlobeClearingHouse } from "./domains/central_bank/GlobeClearingHouse.js";
import { GlobeTreasury } from "./domains/treasury/GlobeTreasury.js";
import { GlobeConstitution } from "./governance/GlobeConstitution.js";
import { GlobeMemberService } from "./GlobeMemberService.js";

/**
 * Monthly demurrage sweep for the globe clearing layer.
 *
 * Mirrors CommonwealthDemurrageScheduler exactly, one level up:
 * charges commonwealths (not federations) whose globe clearing account
 * balance exceeds (creditLineKin × surplusThresholdMultiple), then
 * redistributes the solidarity pool to commonwealths in deficit.
 */
export class GlobeDemurrageScheduler {
    private timer: ReturnType<typeof setInterval> | null = null;

    start(): void {
        this._runIfDue().catch(err =>
            console.error("[GlobeDemurrageScheduler] startup check failed:", err),
        );

        this.timer = setInterval(() => {
            this._runIfDue().catch(err =>
                console.error("[GlobeDemurrageScheduler] sweep failed:", err),
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
        const ch = GlobeClearingHouse.getInstance();
        if (!ch.isReady()) {
            console.warn("[GlobeDemurrageScheduler] clearing house not ready, skipping sweep");
            return;
        }

        const treasury = GlobeTreasury.getInstance();
        if (!treasury.isReady()) {
            console.warn("[GlobeDemurrageScheduler] treasury not ready, skipping sweep");
            return;
        }

        const constitution = GlobeConstitution.getInstance();
        const members      = GlobeMemberService.getInstance().getAll();

        console.log(`[GlobeDemurrageScheduler] running demurrage sweep for ${monthKey}`);

        const sweepResults = await ch.sweepDemurrage(
            members,
            constitution.surplusThresholdMultiple,
            constitution.surplusDemurrageRate,
            constitution.solidarityPoolFraction,
            treasury.accountId,
        );

        if (sweepResults.length === 0) {
            console.log("[GlobeDemurrageScheduler] no commonwealths above surplus threshold");
        }

        console.log(`[GlobeDemurrageScheduler] running solidarity redistribution for ${monthKey}`);
        const redistResults = await ch.redistributeSolidarity(members);

        if (redistResults.length === 0) {
            console.log("[GlobeDemurrageScheduler] no commonwealths in deficit, solidarity pool retained");
        } else {
            const total = redistResults.reduce((s, r) => s + r.received, 0);
            console.log(`[GlobeDemurrageScheduler] redistributed ${total} kin to ${redistResults.length} commonwealth(s)`);
        }
    }
}
