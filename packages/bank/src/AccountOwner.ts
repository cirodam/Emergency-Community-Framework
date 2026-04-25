import { randomUUID } from "crypto";

export type OwnerType = "person" | "institution";

export interface AccountOwnerRecord {
    ownerId: string;
    ownerType: OwnerType;
    displayName: string;
    createdAt: string; // ISO 8601
    phone?: string;
    passwordHash?: string;
    pinHash?: string;
    /** Ed25519 public key (hex) — used for institution-to-bank signed requests */
    publicKeyHex?: string;
}

/**
 * An entity that can own bank accounts.
 *
 * Persons authenticate with a password (web) or PIN (SMS/USSD).
 * Institutions authenticate by signing requests with their Ed25519 private key.
 *
 * Auth hashes are stored on the record but never returned in API responses.
 */
export class AccountOwner {
    readonly ownerId: string;
    readonly ownerType: OwnerType;
    readonly createdAt: Date;

    displayName: string;
    phone: string | undefined;
    /** scrypt-hashed password in "salt:hash" format. Never expose via API. */
    passwordHash: string | undefined;
    /** scrypt-hashed PIN in "salt:hash" format. Never expose via API. */
    pinHash: string | undefined;
    /** Ed25519 public key (hex) for institution signature verification. */
    publicKeyHex: string | undefined;

    constructor(
        ownerType: OwnerType,
        displayName: string,
        options?: { ownerId?: string; createdAt?: Date },
    ) {
        this.ownerId     = options?.ownerId   ?? randomUUID();
        this.ownerType   = ownerType;
        this.displayName = displayName;
        this.createdAt   = options?.createdAt ?? new Date();
    }

    static restore(r: AccountOwnerRecord): AccountOwner {
        const owner = new AccountOwner(r.ownerType, r.displayName, {
            ownerId:   r.ownerId,
            createdAt: new Date(r.createdAt),
        });
        owner.phone        = r.phone;
        owner.passwordHash = r.passwordHash;
        owner.pinHash      = r.pinHash;
        owner.publicKeyHex = r.publicKeyHex;
        return owner;
    }
}
