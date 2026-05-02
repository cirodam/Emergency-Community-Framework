import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { NodeService, NodeSigner } from "@ecf/core";
import { Person, PersonCredential, LanguageProficiency } from "./Person.js";
import { PersonLoader } from "./PersonLoader.js";
import { Constitution } from "../governance/Constitution.js";
import type { DomainService } from "../DomainService.js";
import { AppSuspensionService } from "./AppSuspensionService.js";
import { HandleRegistry } from "../HandleRegistry.js";

export interface PersonPatch {
    firstName?: string;
    lastName?: string;
    phone?: string | null;
    disabled?: boolean;
    retired?: boolean;
    steward?: boolean;
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
    private communitySigner: NodeSigner | null = null;

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
     * Set the signer used for issuing credentials.
     * In cluster mode, pass the shared communitySigner so all replicas
     * produce credentials with the same public key.
     */
    setCommunitySigner(signer: NodeSigner): void {
        this.communitySigner = signer;
    }

    /**
     * Set the persistence layer and load all persons from disk.
     * Call once at app startup before any other operations.
     */
    init(loader: PersonLoader): void {
        this.loader = loader;
        for (const person of loader.loadAll()) {
            this.persons.set(person.id, person);
            HandleRegistry.getInstance().register(person.handle, "person", person.id);
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
        HandleRegistry.getInstance().register(person.handle, "person", person.id);
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
        if (patch.steward   !== undefined) person.steward   = patch.steward;
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
        HandleRegistry.getInstance().release(person.handle);
        this.loader?.delete(person.id);
        this.persons.delete(person.id);
    }

    // ── Credential issuance ───────────────────────────────────────────────────

    /**
     * Resolve app-scoped permission levels for a person based on their current
     * roles and pool memberships. All active members receive "member" on every
     * app. Elevated levels are derived from held roles and pool membership.
     *
     * Pass the DomainService instance to avoid a circular import at module load
     * time (DomainService → PersonService at startup).
     */
    resolveAppPermissions(
        person: Person,
        domainSvc: DomainService,
    ): Record<string, string[]> {
        const perms: Record<string, Set<string>> = {
            bank:   new Set(["member"]),
            market: new Set(["member"]),
            mail:   new Set(["member"]),
        };

        if (this.isSteward(person)) {
            perms.mail.add("moderator");
        }

        // Role-based permissions
        for (const role of domainSvc.getRoles()) {
            if (role.memberId !== person.id) continue;
            const title = role.title.toLowerCase();
            if (title === "teller") {
                perms.bank.add("teller");
            } else if (title === "treasurer") {
                perms.bank.add("teller");
            } else if (title === "marketplace coordinator") {
                perms.market.add("coordinator");
            } else if (title === "food supply officer") {
                perms.market.add("coordinator");
            } else if (title === "community kitchen director") {
                perms.market.add("coordinator");
            } else if (title === "liquid fuel officer") {
                perms.market.add("coordinator");
            } else if (title === "farm coordinator") {
                perms.market.add("coordinator");
            }
        }

        // Pool-based admin permissions
        for (const pool of domainSvc.getPools()) {
            if (!pool.hasPerson(person.id)) continue;
            const name = pool.name.toLowerCase();
            if (name.includes("bank")) {
                perms.bank.add("admin");
            } else if (name.includes("market")) {
                perms.market.add("admin");
            } else if (name.includes("mail")) {
                perms.mail.add("moderator");
            }
        }

        return Object.fromEntries(
            Object.entries(perms).map(([app, set]) => [app, Array.from(set)]),
        );
    }

    /**
     * Overlay suspension state on top of derived permissions.
     * A suspended person gets an empty permission array for that app,
     * meaning their next credential will deny all access.
     */
    resolveAppPermissionsWithSuspensions(
        person: Person,
        domainSvc: DomainService,
    ): Record<string, string[]> {
        const base = this.resolveAppPermissions(person, domainSvc);
        const suspSvc = AppSuspensionService.getInstance();
        for (const app of Object.keys(base)) {
            if (suspSvc.isSuspended(person.id, app)) {
                base[app] = [];
            }
        }
        return base;
    }

    /**
     * Issue or renew a PersonCredential for the given person.
     * The community's NodeSigner signs over a deterministic JSON payload
     * of the six non-signature fields. Persists the updated person record.
     */
    issueCredential(
        person: Person,
        ttlMs: number = DEFAULT_CREDENTIAL_TTL_MS,
        domainSvc?: DomainService,
    ): PersonCredential {
        const node     = NodeService.getInstance();
        const identity = node.getIdentity();
        const signer   = this.communitySigner ?? node.getSigner();
        const communityPublicKey = signer.publicKeyHex;

        const issuedAt  = new Date().toISOString();
        const expiresAt = new Date(Date.now() + ttlMs).toISOString();
        const appPermissions = domainSvc
            ? this.resolveAppPermissionsWithSuspensions(person, domainSvc)
            : { bank: ["member"], market: ["member"], mail: ["member"] };

        const payload = JSON.stringify({
            personId:           person.id,
            handle:             person.handle,
            personPublicKey:    person.publicKeyHex,
            communityNodeId:    identity.id,
            communityPublicKey,
            issuedAt,
            expiresAt,
            appPermissions,
        });

        const credential: PersonCredential = {
            personId:           person.id,
            handle:             person.handle,
            personPublicKey:    person.publicKeyHex,
            communityNodeId:    identity.id,
            communityPublicKey,
            issuedAt,
            expiresAt,
            appPermissions,
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

        const communityPublicKey = (this.communitySigner ?? NodeService.getInstance().getSigner()).publicKeyHex;

        const payload = JSON.stringify({
            personId:           credential.personId,
            handle:             credential.handle,
            personPublicKey:    credential.personPublicKey,
            communityNodeId:    credential.communityNodeId,
            communityPublicKey: credential.communityPublicKey,
            issuedAt:           credential.issuedAt,
            expiresAt:          credential.expiresAt,
            appPermissions:     credential.appPermissions ?? {},
        });

        return NodeSigner.verify(payload, credential.signature, communityPublicKey);
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

    /**
     * Returns true when the person holds steward privileges.
     * Two paths: explicit flag set by an existing steward, OR membership
     * duration has reached the constitutional threshold.
     */
    isSteward(person: Person): boolean {
        if (person.steward) return true;
        const threshold = (() => {
            try { return Constitution.getInstance().stewardshipThresholdYears; }
            catch { return 3; }
        })();
        const yearsAsMember = (Date.now() - person.joinDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
        return yearsAsMember >= threshold;
    }

    grantSteward(personId: string): Person {
        const person = this.persons.get(personId);
        if (!person) throw new Error(`Person ${personId} not found`);
        person.steward = true;
        this.save(person);
        return person;
    }

    revokeSteward(personId: string): Person {
        const person = this.persons.get(personId);
        if (!person) throw new Error(`Person ${personId} not found`);
        person.steward = false;
        this.save(person);
        return person;
    }

    // ── Auth ──────────────────────────────────────────────────────────────────

    async setPin(personId: string, pin: string): Promise<void> {
        const person = this.persons.get(personId);
        if (!person) throw new Error(`Person ${personId} not found`);
        if (!/^\d{4,8}$/.test(pin)) throw new Error("PIN must be 4–8 digits");
        person.setPinHash(await hashSecret(pin));
        this.save(person);
    }

    async verifyPin(personId: string, pin: string): Promise<boolean> {
        const person = this.persons.get(personId);
        const stored = person?.getCredentialsForPersistence().pinHash ?? null;
        if (!stored) {
            await hashSecret(pin); // timing uniformity — prevent user-existence oracle
            return false;
        }
        return verifySecret(pin, stored);
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

