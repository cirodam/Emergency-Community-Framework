import {
    randomUUID,
    generateKeyPairSync,
    sign as signEd25519,
    createPrivateKey,
    type KeyObject,
} from "crypto";
import { IEconomicActor } from "@ecf/core";

/**
 * An organization that exists within a community — a cooperative, business,
 * mutual aid group, etc.
 *
 * The organization is its own cryptographic principal: the community generates
 * and holds an Ed25519 keypair on behalf of the org, used to sign outbound
 * requests. Members authorize actions through their own person credentials;
 * the community service uses the org key to sign.
 *
 * An org requires at least one member to exist. Removing the last member
 * dissolves it.
 */
export class Organization implements IEconomicActor {

    readonly id: string;
    readonly createdAt: string;
    readonly foundedBy: string;     // personId of the founding member

    handle: string;                 // unique within community, lowercase alphanumeric + hyphens
    name: string;
    description: string | null;
    memberIds: string[];
    dissolvedAt: string | null;

    private _privateKey: KeyObject;
    private _privateKeyDer: string;
    private _publicKeyHex: string;

    constructor(
        handle: string,
        name: string,
        foundedBy: string,
        description: string | null = null,
    ) {
        this.id          = randomUUID();
        this.createdAt   = new Date().toISOString();
        this.foundedBy   = foundedBy;
        this.handle      = handle.toLowerCase().replace(/[^a-z0-9-]/g, "");
        this.name        = name.trim();
        this.description = description;
        this.memberIds   = [foundedBy];
        this.dissolvedAt = null;

        const { privateKey, publicKey } = generateKeyPairSync("ed25519");
        this._privateKey    = privateKey;
        this._privateKeyDer = privateKey.export({ type: "pkcs8", format: "der" }).toString("hex");
        this._publicKeyHex  = publicKey.export({ type: "spki", format: "der" }).toString("hex");
    }

    // ── IEconomicActor ────────────────────────────────────────────────────────

    getId(): string          { return this.id; }
    getDisplayName(): string { return this.name; }
    getHandle(): string      { return this.handle; }

    // ── Identity ──────────────────────────────────────────────────────────────

    /** Hex-encoded SPKI DER public key. Safe to share. */
    get publicKeyHex(): string { return this._publicKeyHex; }

    get isActive(): boolean { return this.dissolvedAt === null; }

    /**
     * Sign a message on behalf of the organization.
     * Returns a hex-encoded Ed25519 signature.
     */
    sign(message: string): string {
        return signEd25519(null, Buffer.from(message, "utf-8"), this._privateKey).toString("hex");
    }

    /** @internal Only for use by OrgLoader. */
    getKeypairForPersistence(): { privateKeyDer: string; publicKeyHex: string } {
        return { privateKeyDer: this._privateKeyDer, publicKeyHex: this._publicKeyHex };
    }

    // ── Membership ────────────────────────────────────────────────────────────

    addMember(personId: string): void {
        if (!this.memberIds.includes(personId)) {
            this.memberIds.push(personId);
        }
    }

    removeMember(personId: string): void {
        this.memberIds = this.memberIds.filter(id => id !== personId);
    }

    dissolve(): void {
        this.dissolvedAt = new Date().toISOString();
        this.memberIds   = [];
    }

    // ── Restore ───────────────────────────────────────────────────────────────

    static restore(record: {
        id:            string;
        handle:        string;
        name:          string;
        description:   string | null;
        foundedBy:     string;
        memberIds:     string[];
        createdAt:     string;
        dissolvedAt:   string | null;
        privateKeyDer: string;
        publicKeyHex:  string;
    }): Organization {
        const org = new Organization(record.handle, record.name, record.foundedBy, record.description);
        (org as unknown as Record<string, unknown>)["id"]          = record.id;
        (org as unknown as Record<string, unknown>)["createdAt"]   = record.createdAt;
        (org as unknown as Record<string, unknown>)["foundedBy"]   = record.foundedBy;
        org.memberIds   = record.memberIds;
        org.dissolvedAt = record.dissolvedAt;
        org._privateKey = createPrivateKey({
            key:    Buffer.from(record.privateKeyDer, "hex"),
            format: "der",
            type:   "pkcs8",
        });
        org._privateKeyDer = record.privateKeyDer;
        org._publicKeyHex  = record.publicKeyHex;
        return org;
    }
}
