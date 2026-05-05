import {
    LyceumSession,
    SessionCategory,
    InstructorSplit,
    AttendanceRecord,
    createSession,
} from "./Session.js";
import { SessionLoader } from "./SessionLoader.js";

export interface SessionPatch {
    title?:             string;
    description?:       string;
    category?:          SessionCategory;
    scheduledAt?:       string;
    durationMinutes?:   number;
    location?:          string;
    capacity?:          number | null;
    instructorRateKin?: number;
    studentStipendKin?: number;
    instructorSplits?:  InstructorSplit[];
}

export class SessionService {
    private static instance: SessionService;
    private sessions: Map<string, LyceumSession> = new Map();
    private loader!: SessionLoader;

    private constructor() {}

    static getInstance(): SessionService {
        if (!SessionService.instance) SessionService.instance = new SessionService();
        return SessionService.instance;
    }

    init(loader: SessionLoader): void {
        this.loader = loader;
        for (const s of loader.loadAll()) {
            this.sessions.set(s.id, s);
        }
    }

    // ── Queries ───────────────────────────────────────────────────────────────

    get(id: string): LyceumSession | undefined {
        return this.sessions.get(id);
    }

    getAll(): LyceumSession[] {
        return Array.from(this.sessions.values())
            .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
    }

    getByStatus(category?: SessionCategory): LyceumSession[] {
        return this.getAll().filter(s =>
            s.status === "approved" && (!category || s.category === category),
        );
    }

    getByCourse(courseId: string): LyceumSession[] {
        return this.getAll().filter(s => s.courseId === courseId);
    }

    getByInstructor(instructorId: string): LyceumSession[] {
        return this.getAll().filter(s => s.instructorIds.includes(instructorId));
    }

    // ── Mutations ─────────────────────────────────────────────────────────────

    create(
        instructorId: string,
        instructorHandle: string,
        title: string,
        description: string,
        category: SessionCategory,
        scheduledAt: string,
        durationMinutes: number,
        location: string,
        instructorRateKin: number,
        studentStipendKin: number,
        capacity: number | null,
        courseId: string | null = null,
        instructorSplits?: InstructorSplit[],
    ): LyceumSession {
        const s = createSession(
            instructorId,
            instructorHandle,
            title,
            description,
            category,
            scheduledAt,
            durationMinutes,
            location,
            instructorRateKin,
            studentStipendKin,
            capacity,
            courseId,
            instructorSplits,
        );
        this.sessions.set(s.id, s);
        this.loader.save(s);
        return s;
    }

    update(id: string, callerId: string, patch: SessionPatch): LyceumSession {
        const s = this.sessions.get(id);
        if (!s) throw new Error(`Session ${id} not found`);
        if (!s.instructorIds.includes(callerId)) throw new Error("Not your session");
        if (s.status !== "draft") throw new Error("Only draft sessions can be edited");

        if (patch.title             !== undefined) s.title             = patch.title;
        if (patch.description       !== undefined) s.description       = patch.description;
        if (patch.category          !== undefined) s.category          = patch.category;
        if (patch.scheduledAt       !== undefined) s.scheduledAt       = patch.scheduledAt;
        if (patch.durationMinutes   !== undefined) s.durationMinutes   = patch.durationMinutes;
        if (patch.location          !== undefined) s.location          = patch.location;
        if (patch.capacity          !== undefined) s.capacity          = patch.capacity;
        if (patch.instructorRateKin !== undefined) s.instructorRateKin = patch.instructorRateKin;
        if (patch.studentStipendKin !== undefined) s.studentStipendKin = patch.studentStipendKin;
        if (patch.instructorSplits  !== undefined) s.instructorSplits  = patch.instructorSplits;

        s.updatedAt = new Date().toISOString();
        this.loader.save(s);
        return s;
    }

    /** Move status from draft → pending-approval. Returns the updated session. */
    submit(id: string, callerId: string): LyceumSession {
        const s = this.sessions.get(id);
        if (!s) throw new Error(`Session ${id} not found`);
        if (!s.instructorIds.includes(callerId)) throw new Error("Not your session");
        if (s.status !== "draft") throw new Error("Only draft sessions can be submitted");

        s.status    = "pending-approval";
        s.updatedAt = new Date().toISOString();
        this.loader.save(s);
        return s;
    }

    /** Called by the community backend webhook when a Teachers pool motion passes. */
    approve(id: string, motionId: string): LyceumSession {
        const s = this.sessions.get(id);
        if (!s) throw new Error(`Session ${id} not found`);
        if (s.status !== "pending-approval") throw new Error("Session is not pending approval");

        s.status           = "approved";
        s.approvalMotionId = motionId;
        s.updatedAt        = new Date().toISOString();
        this.loader.save(s);
        return s;
    }

    enroll(id: string, memberId: string): LyceumSession {
        const s = this.sessions.get(id);
        if (!s) throw new Error(`Session ${id} not found`);
        if (s.status !== "approved") throw new Error("Session is not open for enrollment");
        if (new Date(s.scheduledAt) <= new Date()) throw new Error("Session has already started");
        if (s.enrollmentIds.includes(memberId)) throw new Error("Already enrolled");
        if (s.capacity !== null && s.enrollmentIds.length >= s.capacity) throw new Error("Session is at capacity");

        s.enrollmentIds.push(memberId);
        s.updatedAt = new Date().toISOString();
        this.loader.save(s);
        return s;
    }

    dropOut(id: string, memberId: string): LyceumSession {
        const s = this.sessions.get(id);
        if (!s) throw new Error(`Session ${id} not found`);
        if (!s.enrollmentIds.includes(memberId)) throw new Error("Not enrolled");
        if (new Date(s.scheduledAt) <= new Date()) throw new Error("Cannot drop out after session has started");

        s.enrollmentIds = s.enrollmentIds.filter(mid => mid !== memberId);
        s.updatedAt     = new Date().toISOString();
        this.loader.save(s);
        return s;
    }

    /** Instructor closes the session and records attendance. Triggers payout externally. */
    complete(id: string, callerId: string, log: AttendanceRecord[]): LyceumSession {
        const s = this.sessions.get(id);
        if (!s) throw new Error(`Session ${id} not found`);
        if (!s.instructorIds.includes(callerId)) throw new Error("Not your session");
        if (s.status !== "approved") throw new Error("Session must be approved to complete");

        s.attendanceLog = log;
        s.status        = "completed";
        s.updatedAt     = new Date().toISOString();
        this.loader.save(s);
        return s;
    }

    cancel(id: string, callerId: string): LyceumSession {
        const s = this.sessions.get(id);
        if (!s) throw new Error(`Session ${id} not found`);
        if (!s.instructorIds.includes(callerId)) throw new Error("Not your session");
        if (s.status === "completed" || s.status === "cancelled") throw new Error("Session cannot be cancelled");

        s.status    = "cancelled";
        s.updatedAt = new Date().toISOString();
        this.loader.save(s);
        return s;
    }
}
