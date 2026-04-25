import { Request, Response } from "express";
import { verifyPersonCredential } from "@ecf/core";
import { getCommunityIdentity } from "../communityIdentity.js";
import { Bank } from "../Bank.js";

/**
 * POST /api/auth/login
 * Body: { handle, password }
 *
 * Proxies to the governing community's auth endpoint, verifies the returned
 * PersonCredential locally (no round-trip on subsequent requests), then
 * returns the token + the person's bank accounts so the frontend can bootstrap
 * in a single round-trip.
 */
export async function login(req: Request, res: Response): Promise<void> {
    const { handle, password } = req.body ?? {};
    if (typeof handle !== "string" || !handle) {
        res.status(400).json({ error: "handle is required" }); return;
    }
    if (typeof password !== "string" || !password) {
        res.status(400).json({ error: "password is required" }); return;
    }

    const communityUrl = process.env.COMMUNITY_URL ?? "http://localhost:3002";

    let communityResp: globalThis.Response;
    try {
        communityResp = await fetch(`${communityUrl}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ handle, password }),
        });
    } catch (err) {
        console.error("[bank/auth] community unreachable:", err);
        res.status(503).json({ error: "Community is unreachable. Please try again shortly." });
        return;
    }

    if (!communityResp.ok) {
        const body = await communityResp.json().catch(() => ({})) as { error?: string };
        res.status(communityResp.status).json({ error: body.error ?? "Authentication failed" });
        return;
    }

    const { token, id: personId, firstName, lastName, handle: personHandle } =
        await communityResp.json() as {
            token: string;
            id: string;
            firstName: string;
            lastName: string;
            handle: string;
        };

    // Verify the credential locally so we never forward forged tokens
    let credential: Parameters<typeof verifyPersonCredential>[0];
    try {
        credential = JSON.parse(Buffer.from(token, "base64url").toString("utf-8")) as Parameters<typeof verifyPersonCredential>[0];
    } catch {
        res.status(500).json({ error: "Community returned a malformed credential" });
        return;
    }

    const { nodeId, publicKey } = getCommunityIdentity();
    if (!verifyPersonCredential(credential, nodeId, publicKey)) {
        res.status(401).json({ error: "Community credential failed verification" });
        return;
    }

    // Attach the person's accounts so the frontend can bootstrap in one round-trip
    const accounts = Bank.getInstance().getAccounts(personId).map(a => ({
        accountId: a.accountId,
        label:     a.label,
        currency:  a.currency,
        amount:    a.amount,
    }));

    res.json({
        token,
        personId,
        handle:      personHandle,
        displayName: `${firstName} ${lastName}`,
        accounts,
    });
}

