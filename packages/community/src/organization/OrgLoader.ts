import { BaseLoader } from "@ecf/core";
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

export class OrgLoader extends BaseLoader<OrgRecord, Organization> {
    protected serialize(org: Organization): OrgRecord {
        const { privateKeyDer, publicKeyHex } = org.getKeypairForPersistence();
        return {
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
    }

    protected deserialize(r: OrgRecord): Organization { return Organization.restore(r); }
}
