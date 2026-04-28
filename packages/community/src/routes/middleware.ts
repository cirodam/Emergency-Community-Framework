import { Router, Request, Response, NextFunction, RequestHandler } from "express";
import { requirePersonCredential } from "@ecf/core";
import { getCommunityIdentity } from "../communityIdentity.js";
import { PersonService } from "../person/PersonService.js";

export const requireAuth = requirePersonCredential(getCommunityIdentity);

export const requireSteward: RequestHandler[] = [
    requireAuth,
    (req: Request, res: Response, next: NextFunction) => {
        const personId = (req as unknown as Record<string, unknown>).personId as string | undefined;
        if (!personId) return res.status(403).json({ error: "Steward access required" });
        const person = PersonService.getInstance().get(personId);
        if (!person || !PersonService.getInstance().isSteward(person)) {
            return res.status(403).json({ error: "Steward access required" });
        }
        next();
    },
];
