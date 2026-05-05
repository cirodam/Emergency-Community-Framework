import { BankClient, NodeService } from "@ecf/core";
import type { LyceumSession } from "./Session.js";

/**
 * Handles post-session kin payouts from the community treasury.
 *
 * Treasury account ID must be set via TREASURY_ACCOUNT_ID env var.
 * Atheneum is a node-signed service so it can initiate transfers on
 * behalf of the treasury without a personal credential.
 *
 * Payout rules:
 *   - Each attending student receives studentStipendKin.
 *   - Each instructor receives instructorRateKin * (split.pct / 100), rounded to nearest whole kin.
 *   - Absent students and cancelled sessions receive nothing.
 */
export class PayoutService {
    private static instance: PayoutService;

    private constructor() {}

    static getInstance(): PayoutService {
        if (!PayoutService.instance) PayoutService.instance = new PayoutService();
        return PayoutService.instance;
    }

    private bank(): BankClient {
        return new BankClient(
            process.env.BANK_URL ?? "http://localhost:3001",
            body => NodeService.getInstance().getSigner().signBody(body),
        );
    }

    /**
     * Transfer stipends and instructor pay from treasury to participants.
     *
     * Fires-and-forgets individual transfers so one failure doesn't block others.
     * Logs errors for any transfers that fail.
     */
    async payOut(session: LyceumSession): Promise<void> {
        const treasuryAccountId = process.env.TREASURY_ACCOUNT_ID ?? "";
        if (!treasuryAccountId) {
            console.error("[atheneum] TREASURY_ACCOUNT_ID not configured — skipping payout for session", session.id);
            return;
        }

        const b = this.bank();
        const memo = `Atheneum: ${session.title}`;

        // ── Student stipends ────────────────────────────────────────────────
        for (const record of session.attendanceLog) {
            if (!record.attended) continue;
            try {
                const acct = await b.getPrimaryAccountAsync(record.memberId);
                if (!acct) {
                    console.warn(`[atheneum] no bank account for student ${record.memberId} — skipping stipend`);
                    continue;
                }
                await b.transfer(treasuryAccountId, acct.accountId, session.studentStipendKin, `Student stipend · ${memo}`);
            } catch (err) {
                console.error(`[atheneum] stipend transfer failed for ${record.memberId}:`, err);
            }
        }

        // ── Instructor pay ──────────────────────────────────────────────────
        for (const split of session.instructorSplits) {
            const amount = Math.round(session.instructorRateKin * split.pct / 100);
            if (!amount) continue;
            try {
                const acct = await b.getPrimaryAccountAsync(split.personId);
                if (!acct) {
                    console.warn(`[atheneum] no bank account for instructor ${split.handle} — skipping pay`);
                    continue;
                }
                await b.transfer(treasuryAccountId, acct.accountId, amount, `Instructor pay · ${memo}`);
            } catch (err) {
                console.error(`[atheneum] instructor pay failed for ${split.handle}:`, err);
            }
        }
    }
}
