import { randomUUID } from "crypto";

export type NominationStatus = "pending" | "confirmed" | "declined";

export class Nomination {
    readonly id: string;
    readonly createdAt: Date;
    readonly createdBy: string;   // personId of nominator
    readonly type: "role" | "pool";
    readonly roleId: string;
    readonly unitId: string;
    readonly domainId: string;
    readonly poolId: string | null;  // set when type === "pool"
    readonly nomineeId: string;   // personId of the person being nominated
    statement: string;
    status: NominationStatus;
    resolvedAt: Date | null;
    resolvedBy: string | null;    // personId of steward who confirmed/declined

    constructor(
        createdBy: string,
        roleId: string,
        unitId: string,
        domainId: string,
        nomineeId: string,
        statement: string,
        id?: string,
    ) {
        this.id         = id ?? randomUUID();
        this.createdAt  = new Date();
        this.createdBy  = createdBy;
        this.type       = "role";
        this.roleId     = roleId;
        this.unitId     = unitId;
        this.domainId   = domainId;
        this.poolId     = null;
        this.nomineeId  = nomineeId;
        this.statement  = statement;
        this.status     = "pending";
        this.resolvedAt = null;
        this.resolvedBy = null;
    }

    /** Factory for pool membership nominations. */
    static forPool(
        createdBy: string,
        poolId: string,
        nomineeId: string,
        statement: string,
        id?: string,
    ): Nomination {
        const n = new Nomination(createdBy, "", "", "", nomineeId, statement, id);
        (n as unknown as Record<string, unknown>)["type"]   = "pool";
        (n as unknown as Record<string, unknown>)["poolId"] = poolId;
        return n;
    }
}
