import type { CensusRecord } from "./CensusRecord.js";
import type { CensusRecordLoader } from "./CensusRecordLoader.js";

export interface CensusSummary {
    /** Total nullifiers across all communities after deduplication. */
    uniqueMembers: number;
    /** Total nullifiers submitted (before deduplication). */
    totalSubmitted: number;
    /** Number of nullifiers that appear in more than one community. */
    duplicateCount: number;
    communities: {
        communityId: string;
        memberCount: number;
        nullifierCount: number;
        duplicateCount: number;
        submittedAt: string;
    }[];
}

export class FederationCensusService {
    private static _instance: FederationCensusService;
    private loader!: CensusRecordLoader;
    private records = new Map<string, CensusRecord>();

    private constructor() {}

    static getInstance(): FederationCensusService {
        if (!FederationCensusService._instance) {
            FederationCensusService._instance = new FederationCensusService();
        }
        return FederationCensusService._instance;
    }

    init(loader: CensusRecordLoader): void {
        this.loader = loader;
        for (const r of loader.loadAll()) {
            this.records.set(r.communityId, r);
        }
        console.log(`[FederationCensusService] loaded ${this.records.size} census record(s)`);
    }

    getAll(): CensusRecord[] {
        return [...this.records.values()];
    }

    get(communityId: string): CensusRecord | undefined {
        return this.records.get(communityId);
    }

    /**
     * Accept or refresh a community's census submission.
     *
     * Checks the incoming nullifiers against every other community's current set
     * and returns any that appear in more than one community (duplicates).
     * The duplicate list is stored on the record for later auditing.
     */
    submit(
        communityId: string,
        memberCount: number,
        nullifiers: string[],
    ): { duplicates: string[] } {
        // Collect all nullifiers from OTHER communities
        const others = new Set<string>();
        for (const [id, record] of this.records) {
            if (id !== communityId) {
                for (const n of record.nullifiers) others.add(n);
            }
        }

        const duplicates = nullifiers.filter(n => others.has(n));

        const record: CensusRecord = {
            communityId,
            memberCount,
            nullifiers,
            submittedAt: new Date().toISOString(),
            duplicates,
        };

        this.records.set(communityId, record);
        this.loader.save(record);

        if (duplicates.length > 0) {
            console.warn(
                `[census] ${duplicates.length} duplicate nullifier(s) detected in census from community ${communityId}`,
            );
        }

        return { duplicates };
    }

    getSummary(): CensusSummary {
        const allNullifiers = new Map<string, number>(); // nullifier → count across communities
        for (const record of this.records.values()) {
            for (const n of record.nullifiers) {
                allNullifiers.set(n, (allNullifiers.get(n) ?? 0) + 1);
            }
        }

        const uniqueMembers   = [...allNullifiers.values()].filter(c => c === 1).length;
        const totalSubmitted  = [...allNullifiers.values()].reduce((s, c) => s + c, 0);
        const duplicateCount  = [...allNullifiers.values()].filter(c => c > 1).length;

        const communities = [...this.records.values()].map(r => ({
            communityId:    r.communityId,
            memberCount:    r.memberCount,
            nullifierCount: r.nullifiers.length,
            duplicateCount: r.duplicates.length,
            submittedAt:    r.submittedAt,
        }));

        return { uniqueMembers, totalSubmitted, duplicateCount, communities };
    }
}
