import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { NodeService } from "./NodeService.js";

export type UpstreamApplicationStatus =
    | "submitted" | "under_review" | "approved" | "rejected";

/**
 * Minimum shape that every concrete membership record must satisfy so the
 * shared sync logic can read and update the fields it owns.
 */
export interface BaseMembershipRecord {
    applicationId: string;
    memberId:      string | null;
    status:        UpstreamApplicationStatus;
}

/**
 * Abstract base for the three "upward" membership services:
 *   community   → FederationMembershipService
 *   federation  → CommonwealthMembershipService
 *   commonwealth→ GlobeMembershipService
 *
 * Subclasses provide:
 *   - `buildApplyBody()` — the JSON fields for the POST /api/applications body
 *   - `upstreamUrl()`    — the upstream node's base URL from the current record
 *   - `onApproved()`     — sets account-ID and handle fields on the record
 *                          after the base class has resolved memberId
 */
export abstract class UpstreamMembershipService<TRecord extends BaseMembershipRecord> {
    protected record: TRecord | null = null;
    private readonly filePath: string;

    protected constructor(dataDir: string, filename: string) {
        mkdirSync(dataDir, { recursive: true });
        this.filePath = join(dataDir, filename);
        if (existsSync(this.filePath)) {
            this.record = JSON.parse(readFileSync(this.filePath, "utf-8")) as TRecord;
        }
    }

    getStatus(): TRecord | null {
        return this.record;
    }

    protected save(): void {
        writeFileSync(this.filePath, JSON.stringify(this.record, null, 2), "utf-8");
    }

    // ── Abstract interface ───────────────────────────────────────────────────

    /** Fields to merge into the signed POST /api/applications body. */
    protected abstract buildApplyBody(): Record<string, unknown>;

    /** Base URL of the upstream node extracted from the current record. */
    protected abstract upstreamUrl(): string;

    /**
     * Called after memberId is set.  Implementations should:
     *   1. Fetch /api/members to resolve the bank account ID
     *   2. Fetch /api/identity to resolve handle chain fields
     * Both steps are best-effort (non-fatal on network errors).
     */
    protected abstract onApproved(base: string, memberId: string): Promise<void>;

    // ── Shared implementation ────────────────────────────────────────────────

    /**
     * POST /api/applications at the upstream node, signed with this node's key.
     * Stores the returned application ID and status in the record.
     *
     * `buildRecord` receives the upstream's response `{ id, status }` and
     * constructs the full TRecord to persist.
     */
    protected async submitApplication(
        upstreamUrl:   string,
        buildRecord:   (data: { id: string; status: string }) => TRecord,
        errorPrefix:   string,
    ): Promise<TRecord> {
        const node      = NodeService.getInstance();
        const body      = JSON.stringify(this.buildApplyBody());
        const signature = node.getSigner().signBody(body);
        const base      = upstreamUrl.replace(/\/$/, "");

        const res = await fetch(`${base}/api/applications`, {
            method:  "POST",
            headers: {
                "Content-Type":     "application/json",
                "x-node-signature": signature,
            },
            body,
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({})) as { error?: string };
            throw new Error(`${errorPrefix} (${res.status}): ${err.error ?? "unknown error"}`);
        }

        const data = await res.json() as { id: string; status: string };
        this.record = buildRecord(data);
        this.save();
        return this.record;
    }

    /**
     * Poll upstream for application status. On approval, delegates to
     * `onApproved()` for account/handle resolution then saves.
     */
    async sync(): Promise<TRecord | null> {
        if (!this.record) return null;
        if (this.record.status === "approved" || this.record.status === "rejected") {
            return this.record;
        }

        const base = this.upstreamUrl().replace(/\/$/, "");
        let appData: { status: string; memberId?: string | null };

        try {
            const res = await fetch(`${base}/api/applications/${this.record.applicationId}`);
            if (!res.ok) return this.record;
            appData = await res.json() as typeof appData;
        } catch {
            return this.record; // upstream unreachable — return stale state
        }

        this.record.status = appData.status as UpstreamApplicationStatus;

        if (appData.status === "approved" && appData.memberId) {
            this.record.memberId = appData.memberId;
            await this.onApproved(base, appData.memberId);
        }

        this.save();
        return this.record;
    }
}
