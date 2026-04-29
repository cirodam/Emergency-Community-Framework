import { randomUUID } from "crypto";

export type NominationStatus = "pending" | "confirmed" | "declined";

export class Nomination {
    readonly id: string;
    readonly createdAt: Date;
    readonly createdBy: string;   // personId of nominator
    readonly roleId: string;
    readonly unitId: string;
    readonly domainId: string;
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
        this.roleId     = roleId;
        this.unitId     = unitId;
        this.domainId   = domainId;
        this.nomineeId  = nomineeId;
        this.statement  = statement;
        this.status     = "pending";
        this.resolvedAt = null;
        this.resolvedBy = null;
    }
}
