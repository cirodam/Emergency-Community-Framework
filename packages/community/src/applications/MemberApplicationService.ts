import { MemberApplication } from "./MemberApplication.js";
import { MemberApplicationLoader } from "./MemberApplicationLoader.js";
import { Constitution } from "../governance/Constitution.js";

const FALLBACK_VOUCHES_REQUIRED = 3;

export class MemberApplicationService {
    private static instance: MemberApplicationService;

    private applications: Map<string, MemberApplication> = new Map();
    private loader: MemberApplicationLoader | null = null;

    private admitHandlers: ((app: MemberApplication) => Promise<void>)[] = [];

    private constructor() {}

    static getInstance(): MemberApplicationService {
        if (!MemberApplicationService.instance) {
            MemberApplicationService.instance = new MemberApplicationService();
        }
        return MemberApplicationService.instance;
    }

    // ── Lifecycle ─────────────────────────────────────────────────────────────

    init(loader: MemberApplicationLoader): void {
        this.loader = loader;
        for (const app of loader.loadAll()) {
            this.applications.set(app.id, app);
        }
    }

    // ── Event registration ────────────────────────────────────────────────────

    onAdmitted(handler: (app: MemberApplication) => Promise<void>): void {
        this.admitHandlers.push(handler);
    }

    // ── Queries ───────────────────────────────────────────────────────────────

    getAll(): MemberApplication[] {
        return Array.from(this.applications.values())
            .sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
    }

    get(id: string): MemberApplication | undefined {
        return this.applications.get(id);
    }

    vouchesRequired(): number {
        try {
            return Constitution.getInstance().get<number>("memberAdmissionVouchesRequired");
        } catch {
            return FALLBACK_VOUCHES_REQUIRED;
        }
    }

    // ── Commands ──────────────────────────────────────────────────────────────

    submit(
        firstName: string,
        lastName: string,
        birthDate: string,
        message: string,
        submittedBy: string,
    ): MemberApplication {
        const app = new MemberApplication(firstName, lastName, birthDate, message, submittedBy);
        this.applications.set(app.id, app);
        this.loader?.save(app);
        return app;
    }

    async vouch(id: string, voucherId: string): Promise<MemberApplication> {
        const app = this.applications.get(id);
        if (!app) throw new Error("Application not found");
        if (app.status !== "pending") throw new Error("Application is no longer pending");
        if (app.voucherIds.includes(voucherId)) throw new Error("Already vouched");

        app.voucherIds.push(voucherId);

        if (app.voucherIds.length >= this.vouchesRequired()) {
            app.status     = "admitted";
            app.admittedAt = new Date();
            for (const h of this.admitHandlers) await h(app);
        }

        this.loader?.save(app);
        return app;
    }

    unvouch(id: string, voucherId: string): MemberApplication {
        const app = this.applications.get(id);
        if (!app) throw new Error("Application not found");
        if (app.status !== "pending") throw new Error("Application is no longer pending");

        app.voucherIds = app.voucherIds.filter(v => v !== voucherId);
        this.loader?.save(app);
        return app;
    }

    withdraw(id: string): MemberApplication {
        const app = this.applications.get(id);
        if (!app) throw new Error("Application not found");
        if (app.status !== "pending") throw new Error("Application is not pending");

        app.status = "withdrawn";
        this.loader?.save(app);
        return app;
    }
}
