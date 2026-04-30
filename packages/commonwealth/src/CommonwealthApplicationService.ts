import {
    createApplication,
    type CommonwealthApplication,
    type ApplicationStatus,
} from "./CommonwealthApplication.js";
import { advanceApplication } from "@ecf/core";
import type { CommonwealthApplicationLoader } from "./CommonwealthApplicationLoader.js";

export class CommonwealthApplicationService {
    private static instance: CommonwealthApplicationService;
    private loader!: CommonwealthApplicationLoader;
    private applications = new Map<string, CommonwealthApplication>();

    private constructor() {}

    static getInstance(): CommonwealthApplicationService {
        if (!CommonwealthApplicationService.instance) {
            CommonwealthApplicationService.instance = new CommonwealthApplicationService();
        }
        return CommonwealthApplicationService.instance;
    }

    init(loader: CommonwealthApplicationLoader): void {
        this.loader = loader;
        for (const app of loader.loadAll()) {
            this.applications.set(app.id, app);
        }
        console.log(`[CommonwealthApplicationService] loaded ${this.applications.size} application(s)`);
    }

    getAll(): CommonwealthApplication[] {
        return [...this.applications.values()];
    }

    getById(id: string): CommonwealthApplication | undefined {
        return this.applications.get(id);
    }

    getByNodeId(federationNodeId: string): CommonwealthApplication | undefined {
        for (const app of this.applications.values()) {
            if (app.federationNodeId === federationNodeId) return app;
        }
        return undefined;
    }

    getByHandle(handle: string): CommonwealthApplication | undefined {
        for (const app of this.applications.values()) {
            if (app.federationHandle === handle) return app;
        }
        return undefined;
    }

    submit(
        federationName:      string,
        federationHandle:    string,
        federationNodeId:    string,
        federationPublicKey: string,
        federationUrl:       string,
        federationEntityId:  string,
        populationCount      = 0,
        federationPriority   = 1,
    ): CommonwealthApplication {
        const existing = this.getByNodeId(federationNodeId);
        if (existing && existing.status !== "rejected") {
            throw new Error(
                `Federation ${federationNodeId} already has an application in status "${existing.status}"`,
            );
        }
        const conflict = this.getAll().find(
            a => a.federationHandle === federationHandle &&
                 a.status !== "rejected" &&
                 a.federationEntityId !== federationEntityId,
        );
        if (conflict) {
            throw new Error(`Handle "${federationHandle}" is already taken`);
        }
        const app = createApplication(federationName, federationHandle, federationNodeId, federationPublicKey, federationUrl, federationEntityId, populationCount, federationPriority);
        this.applications.set(app.id, app);
        this.loader.save(app);
        return app;
    }

    /**
     * Advance the status of an application. Transitions are enforced:
     *   submitted → under_review → approved | rejected
     */
    advance(
        id:         string,
        status:     Extract<ApplicationStatus, "under_review" | "approved" | "rejected">,
        reviewNote: string | null = null,
        memberId:   string | null = null,
    ): CommonwealthApplication {
        const app = this.applications.get(id);
        if (!app) throw new Error(`Application ${id} not found`);
        advanceApplication(app, status, reviewNote, memberId);
        this.loader.save(app);
        return app;
    }
}
