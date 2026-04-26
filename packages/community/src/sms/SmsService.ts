import { PersonService } from "../person/PersonService.js";
import { BankClient } from "../BankClient.js";
import { parseSmsCommand } from "./SmsCommandParser.js";
import { SmsRateLimiter } from "./SmsRateLimiter.js";
import type { SmsProvider } from "./SmsProvider.js";

const HELP_TEXT =
    "ECF: BALANCE | SEND <amt> @<handle> <pin>";

/**
 * Handles all inbound SMS commands and sends replies via the provider.
 *
 * A person is identified by their registered phone number (E.164).
 * BALANCE is phone-authenticated (read-only, low risk).
 * SEND requires phone + PIN. After 5 wrong PINs the number is locked
 * for 30 minutes.
 *
 * Call SmsService.getInstance().init(bank, provider) once at startup.
 * The community node acts as a trusted intermediary — transfers are signed
 * with the node key (same as all other institutional bank operations).
 */
export class SmsService {
    private static instance: SmsService;

    private bank: BankClient | null = null;
    private provider: SmsProvider | null = null;
    private readonly rateLimiter = new SmsRateLimiter();

    private constructor() {}

    static getInstance(): SmsService {
        if (!SmsService.instance) SmsService.instance = new SmsService();
        return SmsService.instance;
    }

    // ── Startup ───────────────────────────────────────────────────────────────

    init(bank: BankClient, provider: SmsProvider): void {
        this.bank     = bank;
        this.provider = provider;
        provider.startReceiving((from, body) => this.handle(from, body));
    }

    // ── Inbound entry point (also called by SmsController webhook) ────────────

    async handle(from: string, body: string): Promise<void> {
        console.log(`[sms] inbound from ${from}: ${body}`);
        const reply = await this.dispatch(from, body.trim());
        if (reply) {
            await this.send(from, reply);
        }
    }

    // ── Dispatch ──────────────────────────────────────────────────────────────

    private async dispatch(from: string, body: string): Promise<string> {
        const personSvc = PersonService.getInstance();
        const person    = personSvc.getByPhone(from);

        if (!person) {
            return "Number not registered. Contact your community admin.";
        }

        const cmd = parseSmsCommand(body);

        switch (cmd.type) {
            case "balance":
                return this.handleBalance(person.id);

            case "send":
                return this.handleSend(from, person.id, cmd.amount, cmd.handle, cmd.pin);

            case "help":
            default:
                return HELP_TEXT;
        }
    }

    // ── Command handlers ──────────────────────────────────────────────────────

    private async handleBalance(personId: string): Promise<string> {
        if (!this.bank) return "Banking unavailable.";
        try {
            const account = await this.bank.getPrimaryAccountAsync(personId);
            if (!account) return "No account found.";
            return `Bal: ${account.amount.toLocaleString()} kin`;
        } catch (err) {
            console.error("[sms] balance lookup failed:", err);
            return "Balance unavailable. Try again shortly.";
        }
    }

    private async handleSend(
        fromPhone: string,
        senderId: string,
        amount: number,
        recipientHandle: string,
        pin: string,
    ): Promise<string> {
        if (!this.bank) return "Banking unavailable.";

        const personSvc = PersonService.getInstance();

        // ── Rate limit check ──────────────────────────────────────────────────
        if (this.rateLimiter.isLocked(fromPhone)) {
            const mins = this.rateLimiter.lockoutMinutesRemaining(fromPhone);
            return `Too many wrong PINs. Try again in ${mins} min.`;
        }

        // ── PIN not configured ────────────────────────────────────────────────
        const sender = personSvc.get(senderId);
        if (!sender?.hasPin()) {
            return "No PIN set. Visit the community portal to configure SMS banking.";
        }

        // ── PIN verification ──────────────────────────────────────────────────
        const pinOk = personSvc.verifyPin(senderId, pin);
        if (!pinOk) {
            const remaining = this.rateLimiter.recordFailure(fromPhone);
            if (remaining === 0) {
                return "Wrong PIN. Account locked for 30 min.";
            }
            return `Wrong PIN. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`;
        }
        this.rateLimiter.recordSuccess(fromPhone);

        // ── Recipient lookup ──────────────────────────────────────────────────
        const recipient = personSvc.getByHandle(recipientHandle);
        if (!recipient) {
            return `Unknown recipient @${recipientHandle}.`;
        }
        if (recipient.id === senderId) {
            return "Cannot send to yourself.";
        }

        // ── Account lookup ────────────────────────────────────────────────────
        const [senderAccount, recipientAccount] = await Promise.all([
            this.bank.getPrimaryAccountAsync(senderId),
            this.bank.getPrimaryAccountAsync(recipient.id),
        ]);

        if (!senderAccount) return "No account found.";
        if (!recipientAccount) return `@${recipientHandle} has no account.`;

        if (senderAccount.amount < amount) {
            return `Insufficient balance (${senderAccount.amount.toLocaleString()} kin).`;
        }

        // ── Transfer ──────────────────────────────────────────────────────────
        try {
            await this.bank.transfer(
                senderAccount.accountId,
                recipientAccount.accountId,
                amount,
                `SMS transfer to @${recipientHandle}`,
            );
        } catch (err) {
            console.error("[sms] transfer failed:", err);
            return "Transfer failed. Try again.";
        }

        const newBalance = senderAccount.amount - amount;
        return `Sent ${amount.toLocaleString()} kin to @${recipientHandle}. Bal: ${newBalance.toLocaleString()} kin.`;
    }

    // ── Internal ──────────────────────────────────────────────────────────────

    private async send(to: string, body: string): Promise<void> {
        if (!this.provider) return;
        try {
            await this.provider.send(to, body);
        } catch (err) {
            console.error(`[sms] failed to send reply to ${to}:`, err);
        }
    }
}
