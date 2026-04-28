import logger from "./logger.js";
import { randomUUID } from "crypto";
import { FileStore } from "@ecf/core";
import type { RoutableAddress } from "@ecf/core";

interface TokenRecord {
    /** Opaque UUID given to the external payer. */
    token: string;
    /** The person's internal ID — never leaves this service. */
    personId: string;
    /** The person's bank account ID for crediting incoming payments. */
    bankAccountId: string;
    /** ISO 8601 creation timestamp. */
    createdAt: string;
    /** ISO 8601 expiry, or null for non-expiring tokens. */
    expiresAt: string | null;
    /** If true, the token is invalidated after one successful redemption. */
    singleUse: boolean;
    /** True once a single-use token has been redeemed. */
    redeemed: boolean;
}

/**
 * Issues and redeems opaque payment tokens on behalf of community members.
 *
 * A payment token allows an external institution (hospital, employer, etc.)
 * to route a wage or payment to a person inside this community without
 * knowing who that person is. The token is a UUID — no semantic content.
 *
 * Privacy guarantee: tokens are stored and resolved only inside the community
 * node. No token is ever transmitted with any person-identifying information.
 */
export class PaymentTokenService {
    private static instance: PaymentTokenService;
    private store!: FileStore;
    private ownAddress!: RoutableAddress;

    private constructor() {}

    static getInstance(): PaymentTokenService {
        if (!PaymentTokenService.instance) {
            PaymentTokenService.instance = new PaymentTokenService();
        }
        return PaymentTokenService.instance;
    }

    init(dataDir: string, ownAddress: RoutableAddress): void {
        this.store      = new FileStore(dataDir);
        this.ownAddress = ownAddress;
        logger.info(`[PaymentTokenService] ready (${dataDir})`);
    }

    get address(): RoutableAddress {
        return this.ownAddress;
    }

    /**
     * Issue a new payment token for a person.
     * @param personId       Internal person ID (never transmitted externally).
     * @param bankAccountId  The person's bank account to credit on redemption.
     * @param singleUse      If true, the token is invalidated after one use.
     * @param expiresInDays  If set, the token expires after this many days.
     */
    issue(
        personId: string,
        bankAccountId: string,
        singleUse = false,
        expiresInDays?: number,
    ): string {
        const token    = randomUUID();
        const now      = new Date();
        const expiresAt = expiresInDays
            ? new Date(now.getTime() + expiresInDays * 86_400_000).toISOString()
            : null;

        const record: TokenRecord = {
            token,
            personId,
            bankAccountId,
            createdAt: now.toISOString(),
            expiresAt,
            singleUse,
            redeemed: false,
        };

        this.store.write(token, record);
        return token;
    }

    /**
     * Resolve a token to the target bank account ID, or null if invalid.
     * If the token is single-use, marks it redeemed (invalidating future use).
     */
    redeem(token: string): { bankAccountId: string } | null {
        const record = this.store.read<TokenRecord>(token);
        if (!record) return null;

        if (record.redeemed) return null;

        if (record.expiresAt && new Date(record.expiresAt) < new Date()) {
            return null;
        }

        if (record.singleUse) {
            record.redeemed = true;
            this.store.write(token, record);
        }

        return { bankAccountId: record.bankAccountId };
    }

    /**
     * Rotate a token: invalidate the old one and issue a fresh UUID
     * pointing at the same person and bank account.
     * Returns the new token, or null if the old token was not found.
     */
    rotate(oldToken: string): string | null {
        const record = this.store.read<TokenRecord>(oldToken);
        if (!record) return null;

        // Invalidate old token by marking redeemed
        record.redeemed = true;
        this.store.write(oldToken, record);

        return this.issue(record.personId, record.bankAccountId, record.singleUse);
    }

    /**
     * Revoke a token unconditionally (e.g. person leaving the community).
     */
    revoke(token: string): void {
        this.store.delete(token);
    }

    /**
     * Return all active (non-redeemed, non-expired) tokens for a person.
     * Used for admin/steward views — never exposed externally.
     */
    listForPerson(personId: string): string[] {
        const now = new Date();
        return this.store
            .readAll<TokenRecord>()
            .filter(r =>
                r.personId === personId &&
                !r.redeemed &&
                (!r.expiresAt || new Date(r.expiresAt) > now),
            )
            .map(r => r.token);
    }
}
