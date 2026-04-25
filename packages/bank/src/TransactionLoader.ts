import { createHash } from "crypto";
import { mkdirSync, readdirSync, existsSync, readFileSync, writeFileSync } from "fs";
import { join, resolve } from "path";
import { BankTransaction, Currency } from "./BankTransaction.js";
import { FileStore, DataManifest } from "@ecf/core";

const GENESIS_HASH = "0".repeat(64);

export interface TransactionQuery {
    accountId?: string;
    month?: string; // YYYY-MM; omit to query all months
}

interface TransactionRecord {
    id: string;
    fromAccountId: string;
    toAccountId: string;
    currency: Currency;
    amount: number;
    memo: string;
    timestamp: string;
    previousHash?: string;
    hash?: string;
}

type RecordWithoutHash = Omit<TransactionRecord, "hash">;

/**
 * Account index: maps accountId → sorted array of month buckets that contain
 * at least one transaction for that account.
 *
 * Stored in _account_index.json alongside the chain head file. Updated on
 * every save(). Allows account-scoped queries to skip unrelated month buckets
 * entirely instead of scanning the full ledger.
 */
type AccountIndex = Record<string, string[]>;

function computeHash(record: RecordWithoutHash): string {
    return createHash("sha256").update(JSON.stringify(record), "utf-8").digest("hex");
}

function monthBucket(date: Date): string {
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    return `${date.getFullYear()}-${mm}`;
}

export class TransactionLoader {
    private readonly baseDir: string;
    private readonly chainFile: string;
    private readonly indexFile: string;

    // Cached bucket store per month — avoids re-constructing FileStore on every save()
    private bucketStores: Map<string, FileStore> = new Map();

    constructor(baseDir: string) {
        this.baseDir   = baseDir;
        this.chainFile = join(baseDir, ".chain.json");
        this.indexFile = join(baseDir, "_account_index.json");
    }

    // ── Write ─────────────────────────────────────────────────────────────────

    /** Append a transaction to the current month's bucket, updating the chain head and account index. */
    save(tx: BankTransaction): void {
        const previousHash = this.readChainHead();
        const base: RecordWithoutHash = { ...this.toBaseRecord(tx), previousHash };
        const hash = computeHash(base);

        const bucket = monthBucket(tx.timestamp);
        this.getBucketStore(bucket).write(tx.id, { ...base, hash });
        this.writeChainHead(hash);
        this.updateAccountIndex(tx.fromAccountId, tx.toAccountId, bucket);
    }

    // ── Read ──────────────────────────────────────────────────────────────────

    query(options: TransactionQuery = {}): BankTransaction[] {
        if (!existsSync(this.baseDir)) return [];

        const bucketsToScan = this.resolveBuckets(options);
        if (bucketsToScan.length === 0) return [];

        const rawRecords: TransactionRecord[] = [];
        for (const bucket of bucketsToScan) {
            rawRecords.push(...this.getBucketStore(bucket).readAll<TransactionRecord>());
        }

        rawRecords.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        // Always verify chain integrity — whether querying all records or a subset.
        // A subset that spans multiple months still validates its own internal ordering.
        this.verifyChain(rawRecords);

        return rawRecords
            .filter(r => !options.accountId || r.fromAccountId === options.accountId || r.toAccountId === options.accountId)
            .map(r => this.fromRecord(r));
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    /**
     * Resolve which month buckets to read for a given query.
     *
     * - Both `accountId` and `month` provided → single bucket if index confirms it
     * - `accountId` only → buckets from the account index (O(buckets-for-account))
     * - `month` only → single named bucket
     * - Neither → all buckets (full ledger scan)
     */
    private resolveBuckets(options: TransactionQuery): string[] {
        const allBuckets = existsSync(this.baseDir)
            ? readdirSync(this.baseDir, { withFileTypes: true })
                .filter(d => d.isDirectory())
                .map(d => d.name)
                .sort()
            : [];

        if (options.month && options.accountId) {
            const indexed = this.readAccountIndex()[options.accountId] ?? [];
            return indexed.includes(options.month) ? [options.month] : [];
        }
        if (options.accountId) {
            const indexed = this.readAccountIndex()[options.accountId] ?? [];
            // Intersect with directories that actually exist on disk
            const existing = new Set(allBuckets);
            return indexed.filter(b => existing.has(b));
        }
        if (options.month) {
            return allBuckets.filter(b => b === options.month);
        }
        return allBuckets;
    }

    private verifyChain(records: TransactionRecord[]): void {
        let prevHash: string | null = null;

        for (const record of records) {
            if (!record.hash || record.previousHash === undefined) continue;

            if (prevHash === null) {
                if (record.previousHash !== GENESIS_HASH) {
                    console.warn(
                        `[chain] First chained transaction ${record.id} links to a prior record. ` +
                        `Chain verification starts here.`
                    );
                }
            } else if (record.previousHash !== prevHash) {
                throw new Error(
                    `[chain] Transaction chain is broken at ${record.id} — ` +
                    `a transaction may have been deleted or reordered.`
                );
            }

            const { hash, ...rest } = record;
            if (computeHash(rest) !== hash) {
                throw new Error(
                    `[chain] Transaction ${record.id} hash mismatch — the record may have been tampered with.`
                );
            }

            prevHash = record.hash;
        }
    }

    private readChainHead(): string {
        if (!existsSync(this.chainFile)) return GENESIS_HASH;
        try {
            const content = readFileSync(this.chainFile, "utf-8");
            DataManifest.getInstance().verify(resolve(this.chainFile), content);
            return (JSON.parse(content) as { headHash: string }).headHash ?? GENESIS_HASH;
        } catch {
            return GENESIS_HASH;
        }
    }

    private writeChainHead(hash: string): void {
        mkdirSync(this.baseDir, { recursive: true });
        const content = JSON.stringify({ headHash: hash });
        writeFileSync(this.chainFile, content, "utf-8");
        DataManifest.getInstance().record(resolve(this.chainFile), content);
    }

    private readAccountIndex(): AccountIndex {
        if (!existsSync(this.indexFile)) return {};
        try {
            const content = readFileSync(this.indexFile, "utf-8");
            DataManifest.getInstance().verify(resolve(this.indexFile), content);
            return JSON.parse(content) as AccountIndex;
        } catch {
            return {};
        }
    }

    private updateAccountIndex(fromAccountId: string, toAccountId: string, bucket: string): void {
        const index = this.readAccountIndex();
        for (const id of [fromAccountId, toAccountId]) {
            const buckets = index[id] ?? [];
            if (!buckets.includes(bucket)) {
                buckets.push(bucket);
                buckets.sort();
                index[id] = buckets;
            }
        }
        const content = JSON.stringify(index);
        writeFileSync(this.indexFile, content, "utf-8");
        DataManifest.getInstance().record(resolve(this.indexFile), content);
    }

    private getBucketStore(bucket: string): FileStore {
        let store = this.bucketStores.get(bucket);
        if (!store) {
            store = new FileStore(join(this.baseDir, bucket));
            this.bucketStores.set(bucket, store);
        }
        return store;
    }

    private toBaseRecord(tx: BankTransaction): Omit<TransactionRecord, "previousHash" | "hash"> {
        return {
            id:            tx.id,
            fromAccountId: tx.fromAccountId,
            toAccountId:   tx.toAccountId,
            currency:      tx.currency,
            amount:        tx.amount,
            memo:          tx.memo,
            timestamp:     tx.timestamp.toISOString(),
        };
    }

    private fromRecord(r: TransactionRecord): BankTransaction {
        return BankTransaction.restore(
            r.id,
            r.fromAccountId,
            r.toAccountId,
            r.currency,
            r.amount,
            r.memo,
            new Date(r.timestamp)
        );
    }
}
