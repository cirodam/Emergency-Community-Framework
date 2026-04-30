import { type Request, type Response, type NextFunction, type RequestHandler } from "express";
import type { AuthedRequest } from "./PersonCredential.js";

/**
 * Fetches and caches the list of app-suspended persons from the community.
 *
 * The community exposes GET /api/app-suspensions returning
 * `Array<{ personId: string; app: string }>`.  The cache is refreshed at most
 * once every `ttlMs` milliseconds (default: 60 s).  If the community is
 * unreachable the previous cached set is kept so satellite apps stay up.
 */
export class AppSuspensionCache {
    /** "personId:app" for every active suspension. */
    private suspended: Set<string> = new Set();
    private lastFetch = 0;
    private readonly ttlMs: number;
    private readonly communityUrl: string;
    private refreshPromise: Promise<void> | null = null;

    constructor(communityUrl: string, ttlMs = 60_000) {
        this.communityUrl = communityUrl.replace(/\/$/, "");
        this.ttlMs = ttlMs;
    }

    async isSuspended(personId: string, app: string): Promise<boolean> {
        await this.maybeRefresh();
        return this.suspended.has(`${personId}:${app}`);
    }

    private async maybeRefresh(): Promise<void> {
        if (Date.now() - this.lastFetch < this.ttlMs) return;
        // Coalesce concurrent calls into one in-flight fetch
        if (!this.refreshPromise) {
            this.refreshPromise = this.refresh().finally(() => {
                this.refreshPromise = null;
            });
        }
        return this.refreshPromise;
    }

    private async refresh(): Promise<void> {
        try {
            const res = await fetch(`${this.communityUrl}/api/app-suspensions`, {
                signal: AbortSignal.timeout(5_000),
            });
            if (!res.ok) return;
            const data = await res.json() as Array<{ personId: string; app: string }>;
            this.suspended = new Set(data.map(s => `${s.personId}:${s.app}`));
            this.lastFetch = Date.now();
        } catch {
            // Community unreachable — keep existing cache, do not reset lastFetch
            // so we try again on the next request after ttlMs elapses.
        }
    }
}

/**
 * Express middleware factory.  Returns a handler that rejects requests from
 * persons suspended from `app`.
 *
 * MUST be placed **after** `requirePersonCredential` in the chain (needs
 * `req.credential` set by that middleware).
 */
export function requireNotAppSuspended(app: string, cache: AppSuspensionCache): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        const credential = (req as AuthedRequest).credential;
        if (!credential) { next(); return; }
        try {
            if (await cache.isSuspended(credential.personId, app)) {
                res.status(403).json({ error: `Your access to this app has been suspended` });
                return;
            }
        } catch {
            // If the check fails for any unexpected reason, allow through — suspension
            // enforcement should not take the app down.
        }
        next();
    };
}
