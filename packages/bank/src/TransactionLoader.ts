import { createHash } from "crypto";
import { readdirSync, existsSync, readFileSync, writeFileSync } from "fs";
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

    constructor(baseDir: string) {
        this.baseDir = baseDir;
        this.chainFile = join(baseDir, ".chain.json");
    }

    /** Append a transaction to the current month's bucket with hash chain fields. */
    save(tx: BankTransaction): void {
        const previousHash = this.readChainHead();
        const base: RecordWithoutHash = { ...this.toBaseRecord(tx), previousHash };
        const hash = computeHash(base);
        const store = new FileStore(`${this.baseDir}/${monthBucket(tx.timestamp)}`);
        store.write(tx.id, { ...base, hash });
        this.writeChainHead(hash);
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
        const content = JSON.stringify({ headHash: hash });
        writeFileSync(this.chainFile, content, "utf-8");
        DataManifest.getInstance().record(resolve(this.chainFile), content);
    }

    query(options: TransactionQuery = {}): BankTransaction[] {
        if (!existsSync(this.baseDir)) return [];

        const allBuckets = readdirSync(this.baseDir, { withFileTypes: true })
            .filter(d => d.isDirectory())
            .map(d => d.name)
            .sort();

        const buckets = options.month
            ? allBuckets.filter(b => b === options.month)
            : allBuckets;

        const rawRecords: TransactionRecord[] = [];
        for (const bucket of buckets) {
            const store = new FileStore(`${this.baseDir}/${bucket}`);
            rawRecords.push(...store.readAll<TransactionRecord>());
        }

        rawRecords.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        if (!options.month) this.verifyChain(rawRecords);

        return rawRecords
            .filter(r => !options.accountId || r.fromAccountId === options.accountId || r.toAccountId === options.accountId)
            .map(r => this.fromRecord(r));
    }

    private verifyChain(records: TransactionRecord[]): void {
        let prevHash: string | null = null;

        for (const record of records) {
            if (!record.hash || record.previousHash === undefined) continue;

            if (prevHash === null) {
                if (record.previousHash !== GENESIS_HASH) {
                    console.warn(`[chain] First chained transaction ${record.id} links to a legacy record. Chain verification starts here.`);
                }
            } else if (record.previousHash !== prevHash) {
                throw new Error(
                    `[chain] Transaction chain is broken at ${record.id} — ` +
                    `a transaction may have been deleted or reordered.`
                );
            }

            const { hash, ...rest } = record;
            if (computeHash(rest) !== hash) {
                throw new Error(`[chain] Transaction ${record.id} hash mismatch — the record may have been tampered with.`);
            }

            prevHash = record.hash;
        }
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
