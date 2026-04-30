import {
    createApplication,
    type FederationApplication,
    type ApplicationStatus,
} from "./FederationApplication.js";
import { advanceApplication } from "@ecf/core";
import type { FederationApplicationLoader } from "./FederationApplicationLoader.js";

export class FederationApplicationService {
    private static instance: FederationApplicationService;
    private loader!: FederationApplicationLoader;
    private applications = new Map<string, FederationApplication>();

    private constructor() {}

    static getInstance(): FederationApplicationService {
        if (!FederationApplicationService.instance) {
            FederationApplicationService.instance = new FederationApplicationService();
        }
        return FederationApplicationService.instance;
    }

    init(loader: FederationApplicationLoader): void {
        this.loader = loader;
        for (const app of loader.loadAll()) {
            this.applications.set(app.id, app);
        }
        console.log(`[FederationApplicationService] loaded ${this.applications.size} application(s)`);
    }

    getAll(): FederationApplication[] {
        return [...this.applications.values()];
    }

    getById(id: string): FederationApplication | undefined {
        return this.applications.get(id);
    }

    getByNodeId(communityNodeId: string): FederationApplication | undefined {
        for (const app of this.applications.values()) {
            if (app.communityNodeId === communityNodeId) return app;
        }
        return undefined;
    }

    getByHandle(handle: string): FederationApplication | undefined {
        for (const app of this.applications.values()) {
            if (app.communityHandle === handle) return app;
        }
        return undefined;
    }

    /**
     * Submit a new application. A community may not apply if it already has
     * a non-rejected application on record. The requested handle must be
     * unique across all non-rejected applications.
     */
    submit(
        communityName:      string,
        communityHandle:    string,
        communityNodeId:    string,
        communityPublicKey: string,
        communityUrl:       string,
        communityEntityId:  string,
        memberCount         = 0,
        communityPriority   = 1,
    ): FederationApplication {
        const existing = this.getByNodeId(communityNodeId);
        if (existing && existing.status !== "rejected") {
            throw new Error(
                `Community ${communityNodeId} already has an application in status "${existing.status}"`,
            );
        }

        // Handle uniqueness: block if handle is taken by a different entity
        const conflict = this.getAll().find(
            a => a.communityHandle === communityHandle &&
                 a.status !== "rejected" &&
                 a.communityEntityId !== communityEntityId,
        );
        if (conflict) {
            throw new Error(`Handle "${communityHandle}" is already taken`);
        }

        const app = createApplication(communityName, communityHandle, communityNodeId, communityPublicKey, communityUrl, communityEntityId, memberCount, communityPriority);
        this.applications.set(app.id, app);
        this.loader.save(app);
        return app;
    }

    /**
     * Advance the status of an application. Transitions are enforced:
     *   submitted → under_review → approved | rejected
     * The memberId is set externally after the member record is created.
     */
    advance(
        id:         string,
        status:     Extract<ApplicationStatus, "under_review" | "approved" | "rejected">,
        reviewNote: string | null = null,
        memberId:   string | null = null,
    ): FederationApplication {
        const app = this.applications.get(id);
        if (!app) throw new Error(`Application ${id} not found`);
        advanceApplication(app, status, reviewNote, memberId);
        this.loader.save(app);
        return app;
    }
}
