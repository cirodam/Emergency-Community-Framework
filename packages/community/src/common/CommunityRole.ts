import { randomUUID } from "crypto";

export class CommunityRole {
    readonly id: string;
    title: string;
    description: string;
    memberId: string | null;
    termStartDate: Date | null;
    termEndDate: Date | null;
    kinPerMonth: number;
    funded: boolean;

    constructor(title: string, description: string = "", kinPerMonth: number = 0) {
        this.id = randomUUID();
        this.title = title;
        this.description = description;
        this.kinPerMonth = kinPerMonth;
        this.memberId = null;
        this.termStartDate = null;
        this.termEndDate = null;
        this.funded = kinPerMonth > 0;
    }

    isActive(): boolean {
        if (!this.memberId) return false;
        if (!this.funded) return false;
        const now = new Date();
        if (this.termStartDate && now < this.termStartDate) return false;
        if (this.termEndDate && now > this.termEndDate) return false;
        return true;
    }
}
