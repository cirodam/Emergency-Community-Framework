import { createHash, scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { NodeService, NodeSigner } from "@ecf/core";
import { Person, PersonCredential, LanguageProficiency } from "./Person.js";
import { PersonLoader } from "./PersonLoader.js";

export interface PersonPatch {
    firstName?: string;
    lastName?: string;
    phone?: string | null;
    disabled?: boolean;
    retired?: boolean;
    languages?: LanguageProficiency[];
}

const DEFAULT_CREDENTIAL_TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

const scryptAsync = promisify(scrypt);
const SCRYPT_KEYLEN = 64;

async function hashSecret(secret: string): Promise<string> {
    const salt    = randomBytes(16).toString("hex");
    const derived = (await scryptAsync(secret, salt, SCRYPT_KEYLEN)) as Buffer;
    return `${salt}:${derived.toString("hex")}`;
}

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

export class PersonService {
    private static instance: PersonService;

    private persons: Map<string, Person> = new Map();
    private loader: PersonLoader | null = null;

    private joinHandlers: ((person: Person) => Promise<void>)[] = [];
    private dischargeHandlers: ((person: Person) => Promise<void>)[] = [];
    private anniversaryHandlers: ((person: Person) => Promise<void>)[] = [];

    private constructor() {}

    static getInstance(): PersonService {
        if (!PersonService.instance) PersonService.instance = new PersonService();
        return PersonService.instance;
    }

    // ── Lifecycle ─────────────────────────────────────────────────────────────

    /**
     * Set the persistence layer and load all persons from disk.
     * Call once at app startup before any other operations.
     */
    init(loader: PersonLoader): void {
        this.loader = loader;
        for (const person of loader.loadAll()) {
            this.persons.set(person.id, person);
        }
    }

    // ── Event registration ────────────────────────────────────────────────────

    onPersonJoined(handler: (person: Person) => Promise<void>): void {
        this.joinHandlers.push(handler);
    }

    onPersonDischarged(handler: (person: Person) => Promise<void>): void {
        this.dischargeHandlers.push(handler);
    }

    onPersonAnniversary(handler: (person: Person) => Promise<void>): void {
        this.anniversaryHandlers.push(handler);
    }

    // ── Person lifecycle ──────────────────────────────────────────────────────

    /**
     * Add a new person, issue their credential, fire join handlers, and persist.
     * Join handlers are responsible for opening the person's bank account,
     * issuing their endowment, etc.
     */
    async add(person: Person): Promise<void> {
        this.persons.set(person.id, person);
        this.issueCredential(person);
        for (const h of this.joinHandlers) await h(person);
        this.save(person);
    }

    /**
     * Apply a validated patch to an existing person and persist.
     * Throws if the person does not exist.
     */
    update(id: string, patch: PersonPatch): Person {
        const person = this.persons.get(id);
        if (!person) throw new Error(`Person ${id} not found`);
        if (patch.firstName !== undefined) person.firstName = patch.firstName;
        if (patch.lastName  !== undefined) person.lastName  = patch.lastName;
        if (patch.phone     !== undefined) person.phone     = patch.phone;
        if (patch.disabled  !== undefined) person.disabled  = patch.disabled;
        if (patch.retired   !== undefined) person.retired   = patch.retired;
        if (patch.languages !== undefined) person.languages = patch.languages;
        this.save(person);
        return person;
    }

    /**
     * Discharge a person (departure or death).
     * Discharge handlers are responsible for pool settlement, endowment reclaim,
     * account closure, etc.
     */
    async discharge(person: Person): Promise<void> {
        for (const h of this.dischargeHandlers) await h(person);
        this.loader?.delete(person.id);
        this.persons.delete(person.id);
    }

    // ── Credential issuance ───────────────────────────────────────────────────

    /**
     * Issue or renew a PersonCredential for the given person.
     * The community's NodeSigner signs over a deterministic JSON payload
     * of the six non-signature fields. Persists the updated person record.
     */
    issueCredential(person: Person, ttlMs: number = DEFAULT_CREDENTIAL_TTL_MS): PersonCredential {
        const node = NodeService.getInstance();
        const identity = node.getIdentity();
        const signer = node.getSigner();

        const issuedAt = new Date().toISOString();
        const expiresAt = new Date(Date.now() + ttlMs).toISOString();

        const payload = JSON.stringify({
            personId:         person.id,
            personPublicKey:  person.publicKeyHex,
            communityNodeId:  identity.id,
            communityPublicKey: identity.publicKey,
            issuedAt,
            expiresAt,
        });

        const credential: PersonCredential = {
            personId:           person.id,
            personPublicKey:    person.publicKeyHex,
            communityNodeId:    identity.id,
            communityPublicKey: identity.publicKey,
            issuedAt,
            expiresAt,
            signature:          signer.signBody(payload),
        };

        person.credential = credential;
        this.save(person);
        return credential;
    }

    /**
     * Verify a PersonCredential against the community's own public key.
     * Returns false if expired, signature invalid, or not issued by this node.
     */
    verifyCredential(credential: PersonCredential): boolean {
        const identity = NodeService.getInstance().getIdentity();
        if (credential.communityNodeId !== identity.id) return false;
        if (new Date(credential.expiresAt) < new Date()) return false;

        const payload = JSON.stringify({
            personId:           credential.personId,
            personPublicKey:    credential.personPublicKey,
            communityNodeId:    credential.communityNodeId,
            communityPublicKey: credential.communityPublicKey,
            issuedAt:           credential.issuedAt,
            expiresAt:          credential.expiresAt,
        });

        return NodeSigner.verify(payload, credential.signature, identity.publicKey);
    }

    // ── Queries ───────────────────────────────────────────────────────────────

    get(id: string): Person | undefined {
        return this.persons.get(id);
    }

    getByPhone(phone: string): Person | undefined {
        return Array.from(this.persons.values()).find(p => p.phone === phone);
    }

    getByHandle(handle: string): Person | undefined {
        const normalized = handle.toLowerCase().replace(/[^a-z0-9_]/g, "");
        return Array.from(this.persons.values()).find(p => p.handle === normalized);
    }

    getAll(): Person[] {
        return Array.from(this.persons.values());
    }

    count(): number {
        return this.persons.size;
    }

    // ── Auth ──────────────────────────────────────────────────────────────────

    setPin(personId: string, pin: string): void {
        const person = this.persons.get(personId);
        if (!person) throw new Error(`Person ${personId} not found`);
        person.setPinHash(createHash("sha256").update(pin).digest("hex"));
        this.save(person);
    }

    verifyPin(personId: string, pin: string): boolean {
        const person = this.persons.get(personId);
        if (!person) return false;
        return person.matchesPinHash(createHash("sha256").update(pin).digest("hex"));
    }

    async setPassword(personId: string, password: string): Promise<void> {
        const person = this.persons.get(personId);
        if (!person) throw new Error(`Person ${personId} not found`);
        if (password.length < 8) throw new Error("Password must be at least 8 characters");
        person.setPasswordHash(await hashSecret(password));
        this.save(person);
    }

    /**
     * Verify a password by handle. Always runs the full scrypt comparison
     * to avoid timing oracle. Returns the Person on success, null on failure.
     */
    async verifyPassword(handle: string, password: string): Promise<Person | null> {
        const person = this.getByHandle(handle);
        // Run scrypt even if person not found / no hash, to avoid timing oracle
        const stored = person?.getCredentialsForPersistence().passwordHash ?? `${randomBytes(16).toString("hex")}:${randomBytes(64).toString("hex")}`;
        const ok = await verifySecret(password, stored);
        return (ok && person?.getCredentialsForPersistence().passwordHash) ? person : null;
    }

    /** Call once per day. Fires anniversary handlers for every person whose birthday matches today. */
    async checkAnniversaries(today: Date = new Date()): Promise<void> {
        const mm = today.getMonth();
        const dd = today.getDate();
        for (const person of this.persons.values()) {
            if (person.birthDate.getMonth() === mm && person.birthDate.getDate() === dd) {
                for (const h of this.anniversaryHandlers) await h(person);
            }
        }
    }

    // ── Private ───────────────────────────────────────────────────────────────

    private save(person: Person): void {
        this.loader?.save(person);
    }
}

