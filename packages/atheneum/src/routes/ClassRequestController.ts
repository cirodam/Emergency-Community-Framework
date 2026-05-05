import type { Request, Response } from "express";
import type { AuthedRequest } from "@ecf/core";
import { ClassRequestService } from "../ClassRequestService.js";

const svc = () => ClassRequestService.getInstance();

export function listRequests(_req: Request, res: Response): void {
    res.json(svc().getAll());
}

export function getRequest(req: Request, res: Response): void {
    const r = svc().get(req.params.id as string);
    if (!r) { res.status(404).json({ error: "ClassRequest not found" }); return; }
    res.json(r);
}

export function createRequest(req: Request, res: Response): void {
    const { title, description } = req.body as { title: string; description: string };
    const caller = req as AuthedRequest;
    try {
        const r = svc().create(caller.personId, caller.credential.handle, title, description);
        res.status(201).json(r);
    } catch (err: unknown) {
        res.status(400).json({ error: (err as Error).message });
    }
}

export function upvoteRequest(req: Request, res: Response): void {
    const caller = (req as Request & { personId: string });
    try {
        const r = svc().upvote(req.params.id as string, caller.personId);
        res.json(r);
    } catch (err: unknown) {
        res.status(400).json({ error: (err as Error).message });
    }
}

export function removeUpvoteRequest(req: Request, res: Response): void {
    const caller = (req as Request & { personId: string });
    try {
        const r = svc().removeUpvote(req.params.id as string, caller.personId);
        res.json(r);
    } catch (err: unknown) {
        res.status(400).json({ error: (err as Error).message });
    }
}

export function claimRequest(req: Request, res: Response): void {
    const { sessionId } = req.body as { sessionId: string };
    const caller = req as AuthedRequest;
    try {
        const r = svc().claim(req.params.id as string, caller.credential.handle, sessionId);
        res.json(r);
    } catch (err: unknown) {
        res.status(400).json({ error: (err as Error).message });
    }
}
