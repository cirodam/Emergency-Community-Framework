import { FileStore } from "@ecf/core";
import { Organization } from "./Organization.js";

interface OrgRecord {
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
}

export class OrgLoader {
    private readonly store: FileStore;

    constructor(dataDir: string) {
        this.store = new FileStore(dataDir);
    }

    save(org: Organization): void {
        const { privateKeyDer, publicKeyHex } = org.getKeypairForPersistence();
        const record: OrgRecord = {
            id:          org.id,
            handle:      org.handle,
            name:        org.name,
            description: org.description,
            foundedBy:   org.foundedBy,
            memberIds:   org.memberIds,
            createdAt:   org.createdAt,
            dissolvedAt: org.dissolvedAt,
            privateKeyDer,
            publicKeyHex,
        };
        this.store.write(org.id, record);
    }

    loadAll(): Organization[] {
        return this.store.readAll<OrgRecord>().map(r => Organization.restore(r));
    }

    delete(id: string): boolean {
        return this.store.delete(id);
    }
}
