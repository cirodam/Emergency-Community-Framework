import logger from "../logger.js";
import { Request, Response } from "express";
import { timingSafeEqual } from "crypto";
import { SmsService } from "../sms/SmsService.js";

/**
 * POST /api/sms/inbound
 *
 * Optional inbound webhook — useful for testing or as a fallback if running
 * gammu-smsd externally instead of the built-in serial port driver.
 *
 * Body: { from: string, body: string }
 *
 * Protected by a shared secret in the x-sms-secret header.
 * Set SMS_WEBHOOK_SECRET in the environment. If unset the endpoint is disabled.
 *
 * Example gammu-smsd RunOnReceive script:
 *
 *   #!/bin/sh
 *   curl -s -X POST http://localhost:3002/api/sms/inbound \
 *     -H "Content-Type: application/json" \
 *     -H "x-sms-secret: $SMS_WEBHOOK_SECRET" \
 *     -d "{\"from\": \"$SMS_1_NUMBER\", \"body\": \"$SMS_1_TEXT\"}"
 */
export async function smsInbound(req: Request, res: Response): Promise<void> {
    const secret = process.env.SMS_WEBHOOK_SECRET;
    if (!secret) {
        res.status(503).json({ error: "SMS webhook is not configured (SMS_WEBHOOK_SECRET unset)" });
        return;
    }

    // Constant-time comparison to resist timing attacks (no length pre-check)
    const provided    = req.headers["x-sms-secret"] ?? "";
    const providedBuf = Buffer.from(String(provided)).subarray(0, 512);
    const expectedBuf = Buffer.from(secret).subarray(0, 512);
    const len = Math.max(providedBuf.length, expectedBuf.length);
    const a = Buffer.alloc(len);
    const b = Buffer.alloc(len);
    providedBuf.copy(a);
    expectedBuf.copy(b);
    if (!timingSafeEqual(a, b)) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }

    const { from, body } = req.body ?? {};
    if (typeof from !== "string" || !from.trim()) {
        res.status(400).json({ error: "from is required" });
        return;
    }
    if (typeof body !== "string") {
        res.status(400).json({ error: "body is required" });
        return;
    }

    // Process asynchronously — respond 202 immediately so the caller doesn't time out
    res.status(202).send();
    SmsService.getInstance().handle(from.trim(), body).catch(err =>
        (err: unknown) => logger.error({ err }, "[sms] webhook handler error"),
    );
}
