import { createFederationMember, type FederationMember } from "./FederationMember.js";
import type { FederationMemberLoader } from "./FederationMemberLoader.js";

export class FederationMemberService {
    private static instance: FederationMemberService;
    private loader!: FederationMemberLoader;
    private members = new Map<string, FederationMember>();

    private constructor() {}

    static getInstance(): FederationMemberService {
        if (!FederationMemberService.instance) {
            FederationMemberService.instance = new FederationMemberService();
        }
        return FederationMemberService.instance;
    }

    init(loader: FederationMemberLoader): void {
        this.loader = loader;
        for (const m of loader.loadAll()) {
            this.members.set(m.id, m);
        }
        console.log(`[FederationMemberService] loaded ${this.members.size} member(s)`);
    }

    getAll(): FederationMember[] {
        return [...this.members.values()];
    }

    getById(id: string): FederationMember | undefined {
        return this.members.get(id);
    }

    getByNodeId(communityNodeId: string): FederationMember | undefined {
        for (const m of this.members.values()) {
            if (m.communityNodeId === communityNodeId) return m;
        }
        return undefined;
    }

    /**
     * Register a new member community. Does NOT open a bank account — that is
     * done by the caller after registration so the account ID can be set.
     */
    add(name: string, communityNodeId: string, communityPublicKey: string): FederationMember {
        if (this.getByNodeId(communityNodeId)) {
            throw new Error(`Community node ${communityNodeId} is already a member`);
        }
        const member = createFederationMember(name, communityNodeId, communityPublicKey);
        this.members.set(member.id, member);
        this.loader.save(member);
        return member;
    }

    /** Attach the bank account ID after account creation. */
    setBankAccount(id: string, bankAccountId: string): FederationMember {
        const member = this.members.get(id);
        if (!member) throw new Error(`Member ${id} not found`);
        member.bankAccountId = bankAccountId;
        this.loader.save(member);
        return member;
    }

    remove(id: string): void {
        const member = this.members.get(id);
        if (!member) throw new Error(`Member ${id} not found`);
        this.members.delete(id);
        this.loader.delete(id);
    }
}
