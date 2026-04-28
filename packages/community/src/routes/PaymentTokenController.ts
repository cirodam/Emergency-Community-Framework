import { type Request, type Response } from "express";
import { PaymentTokenService } from "../PaymentTokenService.js";
import { PersonService } from "../person/PersonService.js";
import { serializeRoutableAddress } from "@ecf/core";
import { nodeBankClient as bank } from "../nodeBankClient.js";

// ── Token management (steward-only) ──────────────────────────────────────────

/**
 * POST /api/payment-tokens
 * Issue a new payment token for a community member.
 * Body: { personId, singleUse?, expiresInDays? }
 */
export async function issueToken(req: Request, res: Response): Promise<void> {
    const { personId, singleUse, expiresInDays } = req.body ?? {};

    if (typeof personId !== "string") {
        res.status(400).json({ error: "personId is required" }); return;
    }

    const person = PersonService.getInstance().get(personId);
    if (!person) {
        res.status(404).json({ error: "Person not found" }); return;
    }

    const account = await bank().getPrimaryAccountAsync(personId);
    if (!account) {
        res.status(422).json({ error: "Person has no bank account" }); return;
    }

    const token = PaymentTokenService.getInstance().issue(
        personId,
        account.accountId,
        singleUse === true,
        typeof expiresInDays === "number" ? expiresInDays : undefined,
    );

    res.status(201).json({
        token,
        address: serializeRoutableAddress(PaymentTokenService.getInstance().address),
    });
}

/**
 * POST /api/payment-tokens/:token/rotate
 * Invalidate the given token and issue a fresh one for the same person.
 */
export function rotateToken(req: Request, res: Response): void {
    const newToken = PaymentTokenService.getInstance().rotate(String(req.params.token ?? ""));
    if (!newToken) {
        res.status(404).json({ error: "Token not found" }); return;
    }
    res.json({
        token: newToken,
        address: serializeRoutableAddress(PaymentTokenService.getInstance().address),
    });
}

/**
 * DELETE /api/payment-tokens/:token
 * Revoke a token unconditionally.
 */
export function revokeToken(req: Request, res: Response): void {
    PaymentTokenService.getInstance().revoke(String(req.params.token ?? ""));
    res.status(204).end();
}

/**
 * GET /api/payment-tokens/person/:personId
 * List active tokens for a person (steward view — never expose externally).
 */
export function listTokensForPerson(req: Request, res: Response): void {
    const person = PersonService.getInstance().get(String(req.params.personId ?? ""));
    if (!person) {
        res.status(404).json({ error: "Person not found" }); return;
    }
    const tokens  = PaymentTokenService.getInstance().listForPerson(person.id);
    const address = serializeRoutableAddress(PaymentTokenService.getInstance().address);
    res.json(tokens.map(t => ({ token: t, address })));
}

// ── Inbound clearing payment ──────────────────────────────────────────────────

/**
 * POST /api/payment-tokens/receive
 * Called by the federation clearing layer when an incoming directed payment
 * arrives for this community. The federation knows only the token — it does
 * not know which person will receive the funds.
 *
 * Body: { token, amount, memo }
 * Auth: x-node-signature from the federation node (verified upstream).
 */
export async function receivePayment(req: Request, res: Response): Promise<void> {
    const { token, amount, memo } = req.body ?? {};

    if (typeof token !== "string") {
        res.status(400).json({ error: "token is required" }); return;
    }
    if (typeof amount !== "number" || amount <= 0) {
        res.status(400).json({ error: "amount must be a positive number" }); return;
    }

    const resolution = PaymentTokenService.getInstance().redeem(token);
    if (!resolution) {
        res.status(404).json({ error: "Token not found, expired, or already redeemed" }); return;
    }

    try {
        const b = bank();
        // The community's federation clearing account holds the inbound kin.
        // Transfer from clearing account → person's account.
        const clearingSvc = await import("../FederationMembershipService.js");
        const record = clearingSvc.FederationMembershipService.getInstance().getStatus();
        if (!record?.federationAccountId) {
            res.status(503).json({ error: "Community has no federation clearing account" }); return;
        }

        await b.transfer(
            record.federationAccountId,
            resolution.bankAccountId,
            amount,
            typeof memo === "string" ? memo : "directed payment",
        );

        res.status(204).end();
    } catch (err) {
        res.status(500).json({ error: (err as Error).message });
    }
}
