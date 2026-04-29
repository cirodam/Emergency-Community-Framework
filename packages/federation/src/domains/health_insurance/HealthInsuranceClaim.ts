import { randomUUID } from "crypto";

export type HealthInsuranceClaimStatus =
    | "pending"
    | "auto-approved"
    | "approved"
    | "rejected"
    | "needs-review";

export interface HealthInsuranceClaimData {
    id:                string;
    communityMemberId: string;
    communityHandle:   string;
    /** The person receiving care — identified within their community. */
    patientName:       string;
    /** Diagnosis / treatment description. */
    reason:            string;
    requestedKin:      number;
    approvedKin:       number | null;
    status:            HealthInsuranceClaimStatus;
    /** Bank transfer ID once funds are disbursed. */
    transferId:        string | null;
    submittedAt:       string;
    reviewedAt:        string | null;
    reviewNote:        string;
}

export class HealthInsuranceClaim {
    readonly id:                string;
    readonly communityMemberId: string;
    readonly communityHandle:   string;
    readonly patientName:       string;
    readonly reason:            string;
    readonly requestedKin:      number;
    readonly submittedAt:       string;

    approvedKin:  number | null;
    status:       HealthInsuranceClaimStatus;
    transferId:   string | null;
    reviewedAt:   string | null;
    reviewNote:   string;

    constructor(opts: {
        communityMemberId: string;
        communityHandle:   string;
        patientName:       string;
        reason:            string;
        requestedKin:      number;
        id?:               string;
        submittedAt?:      string;
        approvedKin?:      number | null;
        status?:           HealthInsuranceClaimStatus;
        transferId?:       string | null;
        reviewedAt?:       string | null;
        reviewNote?:       string;
    }) {
        this.id                = opts.id          ?? randomUUID();
        this.communityMemberId = opts.communityMemberId;
        this.communityHandle   = opts.communityHandle;
        this.patientName       = opts.patientName;
        this.reason            = opts.reason;
        this.requestedKin      = opts.requestedKin;
        this.submittedAt       = opts.submittedAt ?? new Date().toISOString();
        this.approvedKin       = opts.approvedKin  ?? null;
        this.status            = opts.status       ?? "pending";
        this.transferId        = opts.transferId   ?? null;
        this.reviewedAt        = opts.reviewedAt   ?? null;
        this.reviewNote        = opts.reviewNote   ?? "";
    }

    toData(): HealthInsuranceClaimData {
        return {
            id:                this.id,
            communityMemberId: this.communityMemberId,
            communityHandle:   this.communityHandle,
            patientName:       this.patientName,
            reason:            this.reason,
            requestedKin:      this.requestedKin,
            approvedKin:       this.approvedKin,
            status:            this.status,
            transferId:        this.transferId,
            submittedAt:       this.submittedAt,
            reviewedAt:        this.reviewedAt,
            reviewNote:        this.reviewNote,
        };
    }

    static fromData(d: HealthInsuranceClaimData): HealthInsuranceClaim {
        return new HealthInsuranceClaim({
            id:                d.id,
            communityMemberId: d.communityMemberId,
            communityHandle:   d.communityHandle,
            patientName:       d.patientName,
            reason:            d.reason,
            requestedKin:      d.requestedKin,
            submittedAt:       d.submittedAt,
            approvedKin:       d.approvedKin,
            status:            d.status,
            transferId:        d.transferId,
            reviewedAt:        d.reviewedAt,
            reviewNote:        d.reviewNote,
        });
    }
}
