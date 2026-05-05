import { Course, CourseStatus, createCourse } from "./Course.js";
import type { SessionCategory } from "./Session.js";
import { CourseLoader } from "./CourseLoader.js";
import { SessionService } from "./SessionService.js";

export interface CoursePatch {
    title?:         string;
    description?:   string;
    category?:      SessionCategory;
    prerequisites?: string;
}

export class CourseService {
    private static instance: CourseService;
    private courses: Map<string, Course> = new Map();
    private loader!: CourseLoader;

    private constructor() {}

    static getInstance(): CourseService {
        if (!CourseService.instance) CourseService.instance = new CourseService();
        return CourseService.instance;
    }

    init(loader: CourseLoader): void {
        this.loader = loader;
        for (const c of loader.loadAll()) {
            this.courses.set(c.id, c);
        }
    }

    // ── Queries ───────────────────────────────────────────────────────────────

    get(id: string): Course | undefined {
        return this.courses.get(id);
    }

    getAll(): Course[] {
        return Array.from(this.courses.values())
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }

    getByInstructor(instructorId: string): Course[] {
        return this.getAll().filter(c => c.instructorIds.includes(instructorId));
    }

    // ── Mutations ─────────────────────────────────────────────────────────────

    create(
        instructorId: string,
        title: string,
        description: string,
        category: SessionCategory,
        prerequisites: string = "none",
    ): Course {
        const c = createCourse(instructorId, title, description, category, prerequisites);
        this.courses.set(c.id, c);
        this.loader.save(c);
        return c;
    }

    update(id: string, callerId: string, patch: CoursePatch): Course {
        const c = this.courses.get(id);
        if (!c) throw new Error(`Course ${id} not found`);
        if (!c.instructorIds.includes(callerId)) throw new Error("Not your course");
        if (c.status !== "draft") throw new Error("Only draft courses can be edited");

        if (patch.title         !== undefined) c.title         = patch.title;
        if (patch.description   !== undefined) c.description   = patch.description;
        if (patch.category      !== undefined) c.category      = patch.category;
        if (patch.prerequisites !== undefined) c.prerequisites = patch.prerequisites;

        c.updatedAt = new Date().toISOString();
        this.loader.save(c);
        return c;
    }

    addSession(courseId: string, sessionId: string, callerId: string): Course {
        const c = this.courses.get(courseId);
        if (!c) throw new Error(`Course ${courseId} not found`);
        if (!c.instructorIds.includes(callerId)) throw new Error("Not your course");
        if (!c.classIds.includes(sessionId)) {
            c.classIds.push(sessionId);
            c.updatedAt = new Date().toISOString();
            this.loader.save(c);
        }
        return c;
    }

    /** Called when Teachers pool motion passes. Reserves budget and activates course. */
    approve(id: string, motionId: string, budgetReservedKin: number): Course {
        const c = this.courses.get(id);
        if (!c) throw new Error(`Course ${id} not found`);

        c.status             = "active";
        c.approvalMotionId   = motionId;
        c.budgetReservedKin  = budgetReservedKin;
        c.updatedAt          = new Date().toISOString();
        this.loader.save(c);

        // Approve all child sessions
        const sessionSvc = SessionService.getInstance();
        for (const sid of c.classIds) {
            try { sessionSvc.approve(sid, motionId); } catch { /* already approved */ }
        }
        return c;
    }

    enroll(courseId: string, memberId: string): Course {
        const c = this.courses.get(courseId);
        if (!c) throw new Error(`Course ${courseId} not found`);
        if (c.status !== "active") throw new Error("Course is not active");

        // Enroll in all sessions
        const sessionSvc = SessionService.getInstance();
        for (const sid of c.classIds) {
            try { sessionSvc.enroll(sid, memberId); } catch { /* at capacity or already enrolled */ }
        }
        return c;
    }

    cancel(id: string, callerId: string): Course {
        const c = this.courses.get(id);
        if (!c) throw new Error(`Course ${id} not found`);
        if (!c.instructorIds.includes(callerId)) throw new Error("Not your course");
        if (c.status === "completed" || c.status === "cancelled") throw new Error("Course cannot be cancelled");

        c.status    = "cancelled";
        c.updatedAt = new Date().toISOString();
        this.loader.save(c);

        const sessionSvc = SessionService.getInstance();
        for (const sid of c.classIds) {
            try { sessionSvc.cancel(sid, callerId); } catch { /* already cancelled/completed */ }
        }
        return c;
    }
}
