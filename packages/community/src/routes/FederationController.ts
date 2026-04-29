import { Request, Response } from "express";
import { FederationMembershipService } from "../FederationMembershipService.js";

/** GET /api/federation — return current federation membership state */
export async function getFederationStatus(_req: Request, res: Response): Promise<void> {
    const svc = FederationMembershipService.getInstance();
    res.json(svc.getStatus() ?? { status: "none" });
}

/** POST /api/federation/apply — submit an application to join a federation */
export async function applyToFederation(req: Request, res: Response): Promise<void> {
    const { federationUrl, communityName, communityHandle } = req.body as {
        federationUrl?:   string;
        communityName?:   string;
        communityHandle?: string;
    };
    if (!federationUrl || !communityName || !communityHandle) {
        res.status(400).json({ error: "federationUrl, communityName, and communityHandle are required" });
        return;
    }

    try {
        const membership = await FederationMembershipService.getInstance().apply(federationUrl, communityName, communityHandle);
        res.status(201).json(membership);
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        res.status(400).json({ error: msg });
    }
}

/** GET /api/federation/sync — poll the federation and refresh local state */
export async function syncFederationStatus(_req: Request, res: Response): Promise<void> {
    const membership = await FederationMembershipService.getInstance().sync();
    res.json(membership ?? { status: "none" });
}

/**
 * POST /api/federation/register
 *
 * Called BY a federation node to register this community as its founding member,
 * bypassing the normal application flow.  The community verifies the claim by
 * calling back to the federation before accepting.
 *
 * Body: { federationUrl, communityHandle, memberId, bankAccountId? }
 */
export async function registerAsFounded(req: Request, res: Response): Promise<void> {
    const { federationUrl, communityHandle, memberId, bankAccountId } = req.body as {
        federationUrl?:  string;
        communityHandle?: string;
        memberId?:        string;
        bankAccountId?:   string | null;
    };

    if (!federationUrl || !communityHandle || !memberId) {
        res.status(400).json({ error: "federationUrl, communityHandle, and memberId are required" });
        return;
    }

    try {
        const record = await FederationMembershipService.getInstance().register(
            federationUrl,
            communityHandle,
            memberId,
            bankAccountId ?? null,
        );
        res.json(record);
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        const status = msg.includes("Already have") ? 409 : 400;
        res.status(status).json({ error: msg });
    }
}
