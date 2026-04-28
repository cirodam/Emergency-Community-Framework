import {
    createGlobeApplication,
    type GlobeApplication,
    type ApplicationStatus,
} from "./GlobeApplication.js";
import type { GlobeApplicationLoader } from "./GlobeApplicationLoader.js";

export class GlobeApplicationService {
    private static instance: GlobeApplicationService;
    private loader!: GlobeApplicationLoader;
    private applications = new Map<string, GlobeApplication>();

    private constructor() {}

    static getInstance(): GlobeApplicationService {
        if (!GlobeApplicationService.instance) {
            GlobeApplicationService.instance = new GlobeApplicationService();
        }
        return GlobeApplicationService.instance;
    }

    init(loader: GlobeApplicationLoader): void {
        this.loader = loader;
        for (const app of loader.loadAll()) {
            this.applications.set(app.id, app);
        }
        console.log(`[GlobeApplicationService] loaded ${this.applications.size} application(s)`);
    }

    getAll(): GlobeApplication[] {
        return [...this.applications.values()];
    }

    getById(id: string): GlobeApplication | undefined {
        return this.applications.get(id);
    }

    getByNodeId(commonwealthNodeId: string): GlobeApplication | undefined {
        for (const app of this.applications.values()) {
            if (app.commonwealthNodeId === commonwealthNodeId) return app;
        }
        return undefined;
    }

    getByHandle(handle: string): GlobeApplication | undefined {
        for (const app of this.applications.values()) {
            if (app.commonwealthHandle === handle) return app;
        }
        return undefined;
    }

    submit(
        commonwealthName:      string,
        commonwealthHandle:    string,
        commonwealthNodeId:    string,
        commonwealthPublicKey: string,
        commonwealthUrl:       string,
        commonwealthEntityId:  string,
        populationCount        = 0,
        commonwealthPriority   = 1,
    ): GlobeApplication {
        const existing = this.getByNodeId(commonwealthNodeId);
        if (existing && existing.status !== "rejected") {
            throw new Error(
                `Commonwealth ${commonwealthNodeId} already has an application in status "${existing.status}"`,
            );
        }
        const conflict = this.getAll().find(
            a => a.commonwealthHandle === commonwealthHandle &&
                 a.status !== "rejected" &&
                 a.commonwealthEntityId !== commonwealthEntityId,
        );
        if (conflict) {
            throw new Error(`Handle "${commonwealthHandle}" is already taken`);
        }
        const app = createGlobeApplication(
            commonwealthName, commonwealthHandle,
            commonwealthNodeId, commonwealthPublicKey,
            commonwealthUrl,
            commonwealthEntityId,
            populationCount,
            commonwealthPriority,
        );
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
    ): GlobeApplication {
        const app = this.applications.get(id);
        if (!app) throw new Error(`Application ${id} not found`);

        const allowed: Record<ApplicationStatus, ApplicationStatus[]> = {
            draft:        ["submitted"],
            submitted:    ["under_review"],
            under_review: ["approved", "rejected"],
            approved:     [],
            rejected:     [],
        };

        if (!allowed[app.status].includes(status)) {
            throw new Error(
                `Cannot transition application from "${app.status}" to "${status}"`,
            );
        }

        app.status     = status;
        app.reviewedAt = new Date().toISOString();
        app.reviewNote = reviewNote;
        if (memberId) app.memberId = memberId;

        this.loader.save(app);
        return app;
    }
}
