import { randomUUID } from "crypto";
import { AppSuspension } from "./AppSuspension.js";
import { AppSuspensionLoader } from "./AppSuspensionLoader.js";

export class AppSuspensionService {
    private static instance: AppSuspensionService;

    private suspensions: Map<string, AppSuspension> = new Map();
    private loader!: AppSuspensionLoader;

    static getInstance(): AppSuspensionService {
        if (!AppSuspensionService.instance) AppSuspensionService.instance = new AppSuspensionService();
        return AppSuspensionService.instance;
    }

    init(loader: AppSuspensionLoader): void {
        this.loader = loader;
        for (const s of loader.loadAll()) this.suspensions.set(s.id, s);
    }

    // ── Queries ───────────────────────────────────────────────────────────────

    isSuspended(personId: string, app: string): boolean {
        return [...this.suspensions.values()].some(
            s => s.personId === personId && s.app === app,
        );
    }

    getAll(): AppSuspension[] {
        return [...this.suspensions.values()].sort(
            (a, b) => b.suspendedAt.localeCompare(a.suspendedAt),
        );
    }

    getForPerson(personId: string): AppSuspension[] {
        return [...this.suspensions.values()].filter(s => s.personId === personId);
    }

    // ── Mutations ─────────────────────────────────────────────────────────────

    suspend(personId: string, app: string, reason: string, suspendedBy: string): AppSuspension {
        if (this.isSuspended(personId, app)) {
            // Idempotent — return the existing suspension
            return [...this.suspensions.values()].find(
                s => s.personId === personId && s.app === app,
            )!;
        }
        const suspension: AppSuspension = {
            id:          randomUUID(),
            personId,
            app,
            reason:      reason.trim() || "(no reason given)",
            suspendedAt: new Date().toISOString(),
            suspendedBy,
        };
        this.suspensions.set(suspension.id, suspension);
        this.loader.save(suspension);
        return suspension;
    }

    unsuspend(personId: string, app: string): boolean {
        const existing = [...this.suspensions.values()].find(
            s => s.personId === personId && s.app === app,
        );
        if (!existing) return false;
        this.suspensions.delete(existing.id);
        this.loader.delete(existing.id);
        return true;
    }
}
