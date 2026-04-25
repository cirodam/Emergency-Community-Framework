import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { AccountOwner, OwnerType } from "./AccountOwner.js";
import { AccountOwnerLoader } from "./AccountOwnerLoader.js";

const scryptAsync = promisify(scrypt);
const SCRYPT_KEYLEN = 64;

/** Returns "salt_hex:derived_hex" — safe to store, never expose raw. */
async function hashSecret(secret: string): Promise<string> {
    const salt    = randomBytes(16).toString("hex");
    const derived = (await scryptAsync(secret, salt, SCRYPT_KEYLEN)) as Buffer;
    return `${salt}:${derived.toString("hex")}`;
}

/** Constant-time comparison against a stored "salt:hash" string. */
async function verifySecret(secret: string, stored: string): Promise<boolean> {
    const colonIdx = stored.indexOf(":");
    if (colonIdx === -1) return false;
    const salt    = stored.slice(0, colonIdx);
    const hashHex = stored.slice(colonIdx + 1);
    const derived   = (await scryptAsync(secret, salt, SCRYPT_KEYLEN)) as Buffer;
    const expected  = Buffer.from(hashHex, "hex");
    if (derived.length !== expected.length) return false;
    return timingSafeEqual(derived, expected);
}

export interface CreateOwnerOptions {
    phone?: string;
    /** Ed25519 public key (hex) — for institution owners */
    publicKeyHex?: string;
    /**
     * Explicit owner ID. Use the institution's node ID so the ownerId on
     * BankAccount aligns with the node's identity in the network.
     */
    ownerId?: string;
}

export class AccountOwnerService {
    private static instance: AccountOwnerService;

    private owners      = new Map<string, AccountOwner>();
    private byPhone     = new Map<string, AccountOwner>();
    private byPublicKey = new Map<string, AccountOwner>();
    private loader!: AccountOwnerLoader;

    static getInstance(): AccountOwnerService {
        if (!AccountOwnerService.instance) {
            AccountOwnerService.instance = new AccountOwnerService();
        }
        return AccountOwnerService.instance;
    }

    private constructor() {}

    init(loader: AccountOwnerLoader): void {
        this.loader = loader;
        for (const owner of loader.loadAll()) {
            this.index(owner);
        }
    }

    // -------------------------------------------------------------------------
    // Creation
    // -------------------------------------------------------------------------

    create(ownerType: OwnerType, displayName: string, options?: CreateOwnerOptions): AccountOwner {
        if (options?.ownerId && this.owners.has(options.ownerId)) {
            throw new Error(`Owner already exists: ${options.ownerId}`);
        }
        if (options?.phone && this.byPhone.has(options.phone)) {
            throw new Error(`Phone already registered: ${options.phone}`);
        }
        const owner = new AccountOwner(ownerType, displayName, { ownerId: options?.ownerId });
        owner.phone        = options?.phone;
        owner.publicKeyHex = options?.publicKeyHex;
        this.index(owner);
        this.loader.save(owner);
        return owner;
    }

    // -------------------------------------------------------------------------
    // Password auth (persons — web/API access)
    // -------------------------------------------------------------------------

    async setPassword(ownerId: string, password: string): Promise<void> {
        const owner = this.owners.get(ownerId);
        if (!owner) throw new Error(`Owner not found: ${ownerId}`);
        if (password.length < 8) throw new Error("Password must be at least 8 characters");
        owner.passwordHash = await hashSecret(password);
        this.loader.save(owner);
    }

    /**
     * Verify a password by owner ID. Always runs the full scrypt comparison
     * (no early exit on unknown owner) to avoid timing oracle.
     */
    async verifyPassword(ownerId: string, password: string): Promise<boolean> {
        const owner = this.owners.get(ownerId);
        if (!owner?.passwordHash) {
            // Still perform a dummy comparison to keep timing uniform
            await hashSecret(password);
            return false;
        }
        return verifySecret(password, owner.passwordHash);
    }

    // -------------------------------------------------------------------------
    // PIN auth (persons — SMS/USSD banking)
    // -------------------------------------------------------------------------

    async setPin(ownerId: string, pin: string): Promise<void> {
        const owner = this.owners.get(ownerId);
        if (!owner) throw new Error(`Owner not found: ${ownerId}`);
        if (!/^\d{4,8}$/.test(pin)) throw new Error("PIN must be 4–8 digits");
        owner.pinHash = await hashSecret(pin);
        this.loader.save(owner);
    }

    /**
     * Verify a PIN looked up by phone number.
     * Returns the owner on success, undefined on failure.
     */
    async verifyPin(phone: string, pin: string): Promise<AccountOwner | undefined> {
        const owner = this.byPhone.get(phone);
        if (!owner?.pinHash) {
            await hashSecret(pin); // timing uniformity
            return undefined;
        }
        const ok = await verifySecret(pin, owner.pinHash);
        return ok ? owner : undefined;
    }

    // -------------------------------------------------------------------------
    // Lookups
    // -------------------------------------------------------------------------

    get(ownerId: string): AccountOwner | undefined          { return this.owners.get(ownerId); }
    getAll(): AccountOwner[]                                { return Array.from(this.owners.values()); }
    getByPhone(phone: string): AccountOwner | undefined     { return this.byPhone.get(phone); }
    getByPublicKey(hex: string): AccountOwner | undefined   { return this.byPublicKey.get(hex); }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    private index(owner: AccountOwner): void {
        this.owners.set(owner.ownerId, owner);
        if (owner.phone)        this.byPhone.set(owner.phone, owner);
        if (owner.publicKeyHex) this.byPublicKey.set(owner.publicKeyHex, owner);
    }
}
