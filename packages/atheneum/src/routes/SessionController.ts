import type { Request, Response } from "express";
import type { AuthedRequest } from "@ecf/core";
import { SessionService } from "../SessionService.js";
import { PayoutService } from "../PayoutService.js";
import { CommunityClient } from "../CommunityClient.js";
import type { SessionCategory, InstructorSplit, AttendanceRecord } from "../Session.js";

const svc = () => SessionService.getInstance();

export function listSessions(req: Request, res: Response): void {
    const { status, category, instructorId, courseId } = req.query as Record<string, string | undefined>;
    let sessions = svc().getAll();
    if (status)       sessions = sessions.filter(s => s.status === status);
    if (category)     sessions = sessions.filter(s => s.category === category);
    if (instructorId) sessions = sessions.filter(s => s.instructorIds.includes(instructorId));
    if (courseId)     sessions = sessions.filter(s => s.courseId === courseId);
    res.json(sessions);
}

export function getSession(req: Request, res: Response): void {
    const s = svc().get(req.params.id as string);
    if (!s) { res.status(404).json({ error: "Session not found" }); return; }
    res.json(s);
}

export function createSession(req: Request, res: Response): void {
    const {
        title, description, category, scheduledAt, durationMinutes,
        location, instructorRateKin, studentStipendKin, capacity,
        courseId, instructorSplits,
    } = req.body as {
        title: string; description: string; category: SessionCategory;
        scheduledAt: string; durationMinutes: number; location: string;
        instructorRateKin: number; studentStipendKin: number;
        capacity?: number | null; courseId?: string | null;
        instructorSplits?: InstructorSplit[];
    };

    const caller = req as AuthedRequest;
    try {
        const s = svc().create(
            caller.personId, caller.credential.handle,
            title, description, category,
            scheduledAt, durationMinutes, location,
            instructorRateKin, studentStipendKin,
            capacity ?? null, courseId ?? null,
            instructorSplits,
        );
        res.status(201).json(s);
    } catch (err: unknown) {
        res.status(400).json({ error: (err as Error).message });
    }
}

export function updateSession(req: Request, res: Response): void {
    const caller = req as AuthedRequest;
    try {
        const s = svc().update(req.params.id as string, caller.personId, req.body as Parameters<SessionService["update"]>[2]);
        res.json(s);
    } catch (err: unknown) {
        res.status(400).json({ error: (err as Error).message });
    }
}

export function submitSession(req: Request, res: Response): void {
    const caller = req as AuthedRequest;
    try {
        const s = svc().submit(req.params.id as string, caller.personId);
        res.json(s);

        // Fire-and-forget: create a governance motion in the Teachers pool.
        // The instructor's token is forwarded so they appear as proposer.
        const token = (req.headers.authorization ?? "").replace(/^Bearer\s+/i, "").trim();
        if (token) {
            CommunityClient.getInstance().getTeachersPoolId().then(poolId => {
                const budget = s.instructorRateKin + s.studentStipendKin * (s.capacity ?? 10);
                return CommunityClient.getInstance().createMotion(token, {
                    title:       `Approve Atheneum session: ${s.title}`,
                    description: `${s.description}\n\nScheduled: ${new Date(s.scheduledAt).toLocaleString()}` +
                                 `\nLocation: ${s.location}` +
                                 `\nInstructor pay: ${s.instructorRateKin} kin` +
                                 `\nStudent stipend: ${s.studentStipendKin} kin each` +
                                 `\nEstimated budget: ${budget} kin`,
                    body:        "atheneum",
                    parentId:    poolId,
                });
            }).then(motionId => {
                if (motionId) {
                    console.info(`[atheneum] created motion ${motionId} for session ${s.id}`);
                }
            }).catch(err => {
                console.error("[atheneum] motion creation failed for session", s.id, err);
            });
        }
    } catch (err: unknown) {
        res.status(400).json({ error: (err as Error).message });
    }
}

export function enrollSession(req: Request, res: Response): void {
    const caller = req as AuthedRequest;
    try {
        const s = svc().enroll(req.params.id as string, caller.personId);
        res.json(s);
    } catch (err: unknown) {
        res.status(400).json({ error: (err as Error).message });
    }
}

export function dropOutSession(req: Request, res: Response): void {
    const caller = req as AuthedRequest;
    try {
        const s = svc().dropOut(req.params.id as string, caller.personId);
        res.json(s);
    } catch (err: unknown) {
        res.status(400).json({ error: (err as Error).message });
    }
}

export function completeSession(req: Request, res: Response): void {
    const caller   = req as AuthedRequest;
    const { log }  = req.body as { log: AttendanceRecord[] };
    try {
        const s = svc().complete(req.params.id as string, caller.personId, log ?? []);
        res.json(s);

        // Fire-and-forget payouts so the response is fast.
        PayoutService.getInstance().payOut(s).catch(err => {
            console.error("[atheneum] payout failed for session", s.id, err);
        });
    } catch (err: unknown) {
        res.status(400).json({ error: (err as Error).message });
    }
}

export function cancelSession(req: Request, res: Response): void {
    const caller = req as AuthedRequest;
    try {
        const s = svc().cancel(req.params.id as string, caller.personId);
        res.json(s);
    } catch (err: unknown) {
        res.status(400).json({ error: (err as Error).message });
    }
}

/** Webhook called by community backend when a Teachers pool motion passes. */
export function approveSession(req: Request, res: Response): void {
    const { motionId } = req.body as { motionId: string };
    try {
        const s = svc().approve(req.params.id as string, motionId);
        res.json(s);
    } catch (err: unknown) {
        res.status(400).json({ error: (err as Error).message });
    }
}
