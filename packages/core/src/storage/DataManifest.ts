import { createHash } from "crypto";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "fs";
import { dirname, relative, resolve } from "path";
import { NodeSigner } from "../network/NodeSigner.js";

const MANIFEST_PATH = "data/.manifest.json";
const EXCLUDED_PREFIX = "data/network";

interface ManifestFile {
    entries: Record<string, string>; // relPath → sha256 hex
    signature: string;               // Ed25519 sig over canonical JSON of entries
}

function sha256hex(content: string): string {
    return createHash("sha256").update(content, "utf-8").digest("hex");
}

/** Stable, sorted JSON serialisation used as the signature payload. */
function canonical(entries: Record<string, string>): string {
    const sorted = Object.fromEntries(
        Object.entries(entries).sort(([a], [b]) => a.localeCompare(b))
    );
    return JSON.stringify(sorted);
}

/**
 * Integrity manifest for all data files.
 *
 * On every FileStore write the file's SHA-256 is recorded here and the
 * whole manifest is re-signed with the node's Ed25519 key. On every read
 * the stored hash is compared against the file content — a mismatch means
 * the file was edited outside of the application.
 *
 * data/network/ is intentionally excluded (it holds the signing key itself).
 */
export class DataManifest {
    private static inst: DataManifest;

    private entries: Record<string, string> = {};
    private signerFn: ((data: string) => string) | null = null;
    private ready = false;

    private constructor() {}

    static getInstance(): DataManifest {
        if (!DataManifest.inst) DataManifest.inst = new DataManifest();
        return DataManifest.inst;
    }

    private toRel(absPath: string): string {
        return relative(resolve("."), absPath).replace(/\\/g, "/");
    }

    private isExcluded(rel: string): boolean {
        return rel === EXCLUDED_PREFIX || rel.startsWith(EXCLUDED_PREFIX + "/");
    }

    /**
     * Initialise the manifest using the node's signing key.
     * Must be called after NodeService.init() and before any FileStore reads.
     * Throws on signature mismatch or any per-file hash mismatch.
     */
    init(signerFn: (data: string) => string, pubKeyHex: string): void {
        this.signerFn = signerFn;

        if (existsSync(MANIFEST_PATH)) {
            const raw = JSON.parse(readFileSync(MANIFEST_PATH, "utf-8")) as ManifestFile;
            if (!NodeSigner.verify(canonical(raw.entries), raw.signature, pubKeyHex)) {
                throw new Error(
                    "[manifest] Manifest signature is invalid. " +
                    "The manifest file may have been tampered with."
                );
            }
            this.entries = raw.entries;
            this.verifyAllOnDisk();
        }

        this.ready = true;
        this.save();
    }

    private verifyAllOnDisk(): void {
        for (const [rel, expected] of Object.entries(this.entries)) {
            if (!existsSync(rel)) {
                if (
                    /^data\/transactions\/\d{4}-\d{2}\//.test(rel) ||
                    rel.startsWith("data/accounts/")
                ) {
                    throw new Error(
                        `[manifest] Financial record is missing from disk: ${rel}. ` +
                        `The file may have been deleted outside of the application.`
                    );
                }
                console.warn(`[manifest] File listed in manifest not found on disk: ${rel} — removing entry.`);
                delete this.entries[rel];
                continue;
            }
            const content = readFileSync(rel, "utf-8");
            if (sha256hex(content) !== expected) {
                throw new Error(
                    `[manifest] Integrity check failed for ${rel}. ` +
                    `The file has been modified outside of the application.`
                );
            }
        }
    }

    private save(): void {
        if (!this.signerFn) return;
        const payload = canonical(this.entries);
        const signature = this.signerFn(payload);
        mkdirSync(dirname(MANIFEST_PATH), { recursive: true });
        writeFileSync(
            MANIFEST_PATH,
            JSON.stringify({ entries: this.entries, signature }, null, 2),
            "utf-8"
        );
    }

    /** Called by FileStore after every successful write. */
    record(absPath: string, content: string): void {
        const r = this.toRel(absPath);
        if (this.isExcluded(r)) return;
        this.entries[r] = sha256hex(content);
        if (this.ready) this.save();
    }

    /**
     * Called by FileStore before returning data on read.
     * No-op before init() or for excluded paths.
     * Auto-adds files not yet in the manifest (migration path for pre-existing data).
     * Throws on hash mismatch.
     */
    verify(absPath: string, content: string): void {
        if (!this.ready) return;
        const r = this.toRel(absPath);
        if (this.isExcluded(r)) return;
        const expected = this.entries[r];
        if (expected === undefined) {
            this.record(absPath, content);
            return;
        }
        if (sha256hex(content) !== expected) {
            throw new Error(
                `[manifest] Integrity check failed for ${r}. ` +
                `The file has been modified outside of the application.`
            );
        }
    }

    /** Called by FileStore after a file is deleted. */
    remove(absPath: string): void {
        const r = this.toRel(absPath);
        if (!(r in this.entries)) return;
        delete this.entries[r];
        if (this.ready) this.save();
    }
}
