import { randomUUID } from "crypto";

export type ApplicationStatus = "pending" | "admitted" | "withdrawn";

export interface ApplicationData {
    id: string;
    firstName: string;
    lastName: string;
    birthDate: string;       // YYYY-MM-DD
    message: string;
    voucherIds: string[];    // personIds of members who vouched
    status: ApplicationStatus;
    submittedAt: string;     // ISO datetime
    admittedAt: string | null;
    submittedBy: string;     // personId of the member who submitted
}

/**
 * A membership application submitted on behalf of a prospective new member.
 * Once `voucherIds.length` reaches the required threshold the application is
 * automatically admitted and the applicant is converted into a full Person.
 */
export class MemberApplication {

    id: string;
    firstName: string;
    lastName: string;
    birthDate: string;
    message: string;
    voucherIds: string[];
    status: ApplicationStatus;
    submittedAt: Date;
    admittedAt: Date | null;
    submittedBy: string;

    constructor(
        firstName: string,
        lastName: string,
        birthDate: string,
        message: string,
        submittedBy: string,
    ) {
        this.id          = randomUUID();
        this.firstName   = firstName;
        this.lastName    = lastName;
        this.birthDate   = birthDate;
        this.message     = message;
        this.submittedBy = submittedBy;
        this.voucherIds  = [];
        this.status      = "pending";
        this.submittedAt = new Date();
        this.admittedAt  = null;
    }

    static restore(data: ApplicationData): MemberApplication {
        const app = new MemberApplication(
            data.firstName,
            data.lastName,
            data.birthDate,
            data.message,
            data.submittedBy,
        );
        app.id          = data.id;
        app.voucherIds  = [...data.voucherIds];
        app.status      = data.status;
        app.submittedAt = new Date(data.submittedAt);
        app.admittedAt  = data.admittedAt ? new Date(data.admittedAt) : null;
        return app;
    }

    toData(): ApplicationData {
        return {
            id:          this.id,
            firstName:   this.firstName,
            lastName:    this.lastName,
            birthDate:   this.birthDate,
            message:     this.message,
            voucherIds:  [...this.voucherIds],
            status:      this.status,
            submittedAt: this.submittedAt.toISOString(),
            admittedAt:  this.admittedAt?.toISOString() ?? null,
            submittedBy: this.submittedBy,
        };
    }
}
