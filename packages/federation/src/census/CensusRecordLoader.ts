import { FileStore } from "@ecf/core";
import type { CensusRecord } from "./CensusRecord.js";

export class CensusRecordLoader {
    private readonly store: FileStore;

    constructor(dataDir: string) {
        this.store = new FileStore(dataDir);
    }

    save(record: CensusRecord): void {
        this.store.write(record.communityId, record);
    }

    load(communityId: string): CensusRecord | null {
        return this.store.read<CensusRecord>(communityId) ?? null;
    }

    loadAll(): CensusRecord[] {
        return this.store.readAll<CensusRecord>();
    }

    delete(communityId: string): void {
        this.store.delete(communityId);
    }
}
