import { Request, Response } from "express";
import { getCommunityIdentity } from "../communityIdentity.js";
import { verifyPersonCredential, type PersonCredential } from "@ecf/core";

const COMMUNITY_URL = process.env.COMMUNITY_URL ?? "http://localhost:3002";

/**
 * POST /api/auth/login
 * Body: { handle, password }
 *
 * Proxies to the community node, verifies the returned PersonCredential
 * locally, and returns the token so the frontend can attach it to
 * subsequent requests.
 */
export async function login(req: Request, res: Response): Promise<void> {
    const { handle, password } = req.body ?? {};
    if (typeof handle !== "string" || !handle) {
        res.status(400).json({ error: "handle is required" }); return;
    }
    if (typeof password !== "string" || !password) {
        res.status(400).json({ error: "password is required" }); return;
    }

    let communityResp: globalThis.Response;
    try {
        communityResp = await fetch(`${COMMUNITY_URL}/api/auth/login`, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ handle, password }),
        });
    } catch (err) {
        console.error("[market/auth] community unreachable:", err);
        res.status(503).json({ error: "Community is unreachable. Please try again shortly." });
        return;
    }

    if (!communityResp.ok) {
        const body = await communityResp.json().catch(() => ({})) as { error?: string };
        res.status(communityResp.status).json({ error: body.error ?? "Authentication failed" });
        return;
    }

    const { token, id, firstName, lastName, handle: personHandle } =
        await communityResp.json() as {
            token: string;
            id: string;
            firstName: string;
            lastName: string;
            handle: string;
        };

    // Verify locally before trusting
    let credential: PersonCredential;
    try {
        credential = JSON.parse(Buffer.from(token, "base64url").toString("utf-8")) as PersonCredential;
    } catch {
        res.status(500).json({ error: "Community returned a malformed credential" });
        return;
    }

    const { nodeId, publicKey } = getCommunityIdentity();
    if (!verifyPersonCredential(credential, nodeId, publicKey)) {
        res.status(401).json({ error: "Credential verification failed" });
        return;
    }

    res.json({ id, firstName, lastName, handle: personHandle, token });
}
