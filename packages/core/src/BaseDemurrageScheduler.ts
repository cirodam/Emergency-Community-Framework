/**
 * Shared scheduling scaffold for monthly demurrage sweeps.
 *
 * Checks once per hour and fires `_sweep()` on the 1st of each UTC month,
 * ensuring at most one sweep per calendar month even if the server restarts.
 *
 * Concrete subclasses implement `_sweep(monthKey)` with the layer-specific
 * ClearingHouse, Treasury, Constitution, and MemberService singletons.
 */
export abstract class BaseDemurrageScheduler {
    private timer: ReturnType<typeof setInterval> | null = null;
    private _lastRunMonth: string | null = null;

    protected abstract readonly logTag: string;
    protected abstract _sweep(monthKey: string): Promise<void>;

    start(): void {
        // Run once on startup — catches the case where the server was down on the 1st
        this._runIfDue().catch(err =>
            console.error(`[${this.logTag}] startup check failed:`, err),
        );

        // Check once per hour; fire on the 1st of each month
        this.timer = setInterval(() => {
            this._runIfDue().catch(err =>
                console.error(`[${this.logTag}] sweep failed:`, err),
            );
        }, 60 * 60 * 1_000);
    }

    stop(): void {
        if (this.timer) { clearInterval(this.timer); this.timer = null; }
    }

    private async _runIfDue(): Promise<void> {
        const now = new Date();
        if (now.getUTCDate() !== 1) return;

        const monthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
        if (this._lastRunMonth === monthKey) return;
        this._lastRunMonth = monthKey;

        await this._sweep(monthKey);
    }
}
