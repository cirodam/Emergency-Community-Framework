/**
 * In-memory rate limiter for SMS PIN attempts.
 *
 * After MAX_FAILURES consecutive wrong PINs from a given phone number,
 * all SEND commands from that number are rejected for LOCKOUT_MS.
 * The counter resets on a successful PIN or after the lockout expires.
 */

const MAX_FAILURES  = 5;
const LOCKOUT_MS    = 30 * 60 * 1000; // 30 minutes

interface Entry {
    failures: number;
    lockedUntil: number | null;
}

export class SmsRateLimiter {
    private readonly entries = new Map<string, Entry>();

    /** Returns true if this phone is currently locked out. */
    isLocked(phone: string): boolean {
        const e = this.entries.get(phone);
        if (!e || e.lockedUntil === null) return false;
        if (Date.now() >= e.lockedUntil) {
            // Lockout expired — clear it
            this.entries.delete(phone);
            return false;
        }
        return true;
    }

    /** Call on a failed PIN attempt. Returns remaining attempts before lockout. */
    recordFailure(phone: string): number {
        let e = this.entries.get(phone);
        if (!e) {
            e = { failures: 0, lockedUntil: null };
            this.entries.set(phone, e);
        }
        e.failures += 1;
        if (e.failures >= MAX_FAILURES) {
            e.lockedUntil = Date.now() + LOCKOUT_MS;
            return 0;
        }
        return MAX_FAILURES - e.failures;
    }

    /** Call on a successful PIN. Clears the counter. */
    recordSuccess(phone: string): void {
        this.entries.delete(phone);
    }

    /** How many minutes remain on the lockout (0 if not locked). */
    lockoutMinutesRemaining(phone: string): number {
        const e = this.entries.get(phone);
        if (!e?.lockedUntil) return 0;
        return Math.ceil((e.lockedUntil - Date.now()) / 60_000);
    }
}
