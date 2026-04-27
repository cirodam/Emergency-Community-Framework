import { randomUUID } from "crypto";

/**
 * An Association is any organized group of community members — a business,
 * church, cooperative, club, or any other collective.
 *
 * Roster membership is controlled: only admins can add or remove members.
 * The creator of an association starts as the first admin.
 */
export class Association {
    readonly id: string;
    readonly registeredAt: Date;

    name:        string;
    handle:      string;    // unique slug, e.g. "first_baptist" (future banking: @first_baptist)
    description: string;
    active:      boolean;

    memberIds: string[] = [];   // all members (includes admins)
    adminIds:  string[] = [];   // subset of members with management rights

    constructor(name: string, handle: string, description: string = "", id?: string) {
        this.id           = id ?? randomUUID();
        this.name         = name;
        this.handle       = handle.toLowerCase().replace(/[^a-z0-9_]/g, "_");
        this.description  = description;
        this.active       = true;
        this.registeredAt = new Date();
    }

    // ── Roster ───────────────────────────────────────────────────────────────

    addMember(personId: string): void {
        if (!this.memberIds.includes(personId)) this.memberIds.push(personId);
    }

    removeMember(personId: string): void {
        this.memberIds = this.memberIds.filter(id => id !== personId);
        this.adminIds  = this.adminIds.filter(id => id !== personId);
    }

    hasMember(personId: string): boolean {
        return this.memberIds.includes(personId);
    }

    // ── Admin ────────────────────────────────────────────────────────────────

    addAdmin(personId: string): void {
        this.addMember(personId);
        if (!this.adminIds.includes(personId)) this.adminIds.push(personId);
    }

    removeAdmin(personId: string): void {
        this.adminIds = this.adminIds.filter(id => id !== personId);
    }

    isAdmin(personId: string): boolean {
        return this.adminIds.includes(personId);
    }
}
