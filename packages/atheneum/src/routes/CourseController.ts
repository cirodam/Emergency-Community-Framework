import type { Request, Response } from "express";
import { CourseService } from "../CourseService.js";
import type { SessionCategory } from "../Session.js";

const svc = () => CourseService.getInstance();

export function listCourses(_req: Request, res: Response): void {
    res.json(svc().getAll());
}

export function getCourse(req: Request, res: Response): void {
    const c = svc().get(req.params.id as string);
    if (!c) { res.status(404).json({ error: "Course not found" }); return; }
    res.json(c);
}

export function createCourse(req: Request, res: Response): void {
    const { title, description, category, prerequisites } = req.body as {
        title: string; description: string; category: SessionCategory; prerequisites?: string;
    };
    const caller = (req as Request & { personId: string });
    try {
        const c = svc().create(caller.personId, title, description, category, prerequisites);
        res.status(201).json(c);
    } catch (err: unknown) {
        res.status(400).json({ error: (err as Error).message });
    }
}

export function updateCourse(req: Request, res: Response): void {
    const caller = (req as Request & { personId: string });
    try {
        const c = svc().update(req.params.id as string, caller.personId, req.body as Parameters<CourseService["update"]>[2]);
        res.json(c);
    } catch (err: unknown) {
        res.status(400).json({ error: (err as Error).message });
    }
}

export function enrollCourse(req: Request, res: Response): void {
    const caller = (req as Request & { personId: string });
    try {
        const c = svc().enroll(req.params.id as string, caller.personId);
        res.json(c);
    } catch (err: unknown) {
        res.status(400).json({ error: (err as Error).message });
    }
}

export function cancelCourse(req: Request, res: Response): void {
    const caller = (req as Request & { personId: string });
    try {
        const c = svc().cancel(req.params.id as string, caller.personId);
        res.json(c);
    } catch (err: unknown) {
        res.status(400).json({ error: (err as Error).message });
    }
}

/** Webhook — called when Teachers pool motion passes for a course. */
export function approveCourse(req: Request, res: Response): void {
    const { motionId, budgetReservedKin } = req.body as { motionId: string; budgetReservedKin: number };
    try {
        const c = svc().approve(req.params.id as string, motionId, budgetReservedKin);
        res.json(c);
    } catch (err: unknown) {
        res.status(400).json({ error: (err as Error).message });
    }
}
