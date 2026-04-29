import type { Request, Response } from "express";
import type { FederationPersonRequest } from "./personCredentialMiddleware.js";
import { FederationMemberService } from "../FederationMemberService.js";
import type { PersonCredential } from "@ecf/core";
import { NodeSigner } from "@ecf/core";

// ── Rate limiting ─────────────────────────────────────────────────────────────
// Keyed by client IP. 20 attempts per 15-minute window.
const VERIFY_ATTEMPTS = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS    = 20;
const WINDOW_MS       = 15 * 60 * 1000;

function checkRateLimit(ip: string): boolean {
    const now   = Date.now();
    const entry = VERIFY_ATTEMPTS.get(ip);
    if (!entry || now >= entry.resetAt) {
        VERIFY_ATTEMPTS.set(ip, { count: 1, resetAt: now + WINDOW_MS });
        return true;
    }
    if (entry.count >= MAX_ATTEMPTS) return false;
    entry.count++;
    return true;
}

function memberPersonDto(req: FederationPersonRequest) {
    const cred   = req.federationPersonCredential;
    const member = req.federationMember;
    return {
        personId:          cred.personId,
        handle:            cred.handle,
        communityHandle:   member.handle,
        communityName:     member.name,
        communityMemberId: member.id,
        expiresAt:         cred.expiresAt,
    };
}

// ── Handlers ──────────────────────────────────────────────────────────────────

/**
 * POST /api/auth/verify
 *
 * Verifies a PersonCredential inline (without relying on middleware) so we can
 * return useful error messages for the login form.
 *
 * Body: { token: "<base64url credential>" }
 *       — or —
 * Authorization: Bearer <base64url credential>
 *
 * Returns:
 *   200 { personId, handle, communityHandle, communityName, expiresAt }
 *   401 if invalid / unknown community / expired
 *   429 if rate limited
 */
export function verifyFederationCredential(req: Request, res: Response): void {
    const ip = req.ip ?? req.socket.remoteAddress ?? "unknown";
    if (!checkRateLimit(ip)) {
        res.status(429).json({ error: "Too many attempts. Please try again later." });
        return;
    }

    // Accept token from body OR Authorization header
    const rawToken: unknown =
        (req.body as Record<string, unknown>)?.token ??
        req.headers["authorization"]?.replace(/^Bearer\s+/i, "");

    if (typeof rawToken !== "string" || !rawToken) {
        res.status(400).json({ error: "Provide token in request body or Authorization: Bearer header" });
        return;
    }

    let credential: PersonCredential;
    try {
        const json = Buffer.from(rawToken, "base64url").toString("utf-8");
        credential = JSON.parse(json) as PersonCredential;
    } catch {
        res.status(401).json({ error: "Malformed credential token" });
        return;
    }

    if (new Date(credential.expiresAt) < new Date()) {
        res.status(401).json({ error: "Credential has expired" });
        return;
    }

    if (!credential.communityPublicKey) {
        res.status(401).json({ error: "Credential missing communityPublicKey" });
        return;
    }

    const member = FederationMemberService.getInstance().getByPublicKey(credential.communityPublicKey);
    if (!member) {
        res.status(401).json({ error: "Credential issued by an unknown or non-member community" });
        return;
    }

    const payload = JSON.stringify({
        personId:           credential.personId,
        handle:             credential.handle,
        personPublicKey:    credential.personPublicKey,
        communityNodeId:    credential.communityNodeId,
        communityPublicKey: credential.communityPublicKey,
        issuedAt:           credential.issuedAt,
        expiresAt:          credential.expiresAt,
    });

    if (!NodeSigner.verify(payload, credential.signature, member.communityPublicKey)) {
        res.status(401).json({ error: "Invalid credential signature" });
        return;
    }

    res.json({
        personId:        credential.personId,
        handle:          credential.handle,
        communityHandle: member.handle,
        communityName:   member.name,
        expiresAt:       credential.expiresAt,
    });
}

/**
 * GET /api/me
 *
 * Returns the authenticated person's identity within the federation.
 * Requires the requireFederationMemberPerson() middleware upstream.
 */
export function getMe(req: Request, res: Response): void {
    res.json(memberPersonDto(req as FederationPersonRequest));
}
