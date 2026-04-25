import { FileStore } from "@ecf/core";
import { SocialInsuranceMember } from "./SocialInsuranceMember.js";

interface SocialInsuranceMemberRecord {
    memberId: string;
    poolContributed: number;
    poolReceived: number;
}

export class SocialInsuranceMemberLoader {
    private readonly store: FileStore;

    constructor(dataDir: string) {
        this.store = new FileStore(dataDir);
    }

    save(r: SocialInsuranceMember): void {
        const record: SocialInsuranceMemberRecord = {
            memberId:       r.memberId,
            poolContributed: r.poolContributed,
            poolReceived:    r.poolReceived,
        };
        this.store.write(r.memberId, record);
    }

    loadAll(): SocialInsuranceMember[] {
        return this.store.readAll<SocialInsuranceMemberRecord>().map(r => {
            const m = new SocialInsuranceMember(r.memberId);
            m.poolContributed = r.poolContributed;
            m.poolReceived    = r.poolReceived;
            return m;
        });
    }

    delete(memberId: string): void {
        this.store.delete(memberId);
    }
}
