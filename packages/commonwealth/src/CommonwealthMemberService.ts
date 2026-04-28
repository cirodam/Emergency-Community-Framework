import { createCommonwealthMember, type CommonwealthMember } from "./CommonwealthMember.js";
import type { CommonwealthMemberLoader } from "./CommonwealthMemberLoader.js";

export class CommonwealthMemberService {
    private static instance: CommonwealthMemberService;
    private loader!: CommonwealthMemberLoader;
    private members = new Map<string, CommonwealthMember>();

    private constructor() {}

    static getInstance(): CommonwealthMemberService {
        if (!CommonwealthMemberService.instance) {
            CommonwealthMemberService.instance = new CommonwealthMemberService();
        }
        return CommonwealthMemberService.instance;
    }

    init(loader: CommonwealthMemberLoader): void {
        this.loader = loader;
        for (const m of loader.loadAll()) {
            this.members.set(m.id, m);
        }
        console.log(`[CommonwealthMemberService] loaded ${this.members.size} member(s)`);
    }

    getAll(): CommonwealthMember[] {
        return [...this.members.values()];
    }

    getById(id: string): CommonwealthMember | undefined {
        return this.members.get(id);
    }

    getByNodeId(federationNodeId: string): CommonwealthMember | undefined {
        for (const m of this.members.values()) {
            if (m.federationNodeId === federationNodeId) return m;
        }
        return undefined;
    }

    getByPublicKey(federationPublicKey: string): CommonwealthMember | undefined {
        for (const m of this.members.values()) {
            if (m.federationPublicKey === federationPublicKey) return m;
        }
        return undefined;
    }

    getByHandle(handle: string): CommonwealthMember | undefined {
        return this.getAllByHandle(handle)[0];
    }

    getAllByHandle(handle: string): CommonwealthMember[] {
        return [...this.members.values()]
            .filter(m => m.handle === handle)
            .sort((a, b) => a.priority - b.priority);
    }

    add(
        name: string,
        handle: string,
        federationNodeId: string,
        federationPublicKey: string,
        url: string,
        entityId: string,
        isFounder = false,
        priority  = 1,
    ): CommonwealthMember {
        if (this.getByNodeId(federationNodeId)) {
            throw new Error(`Federation node ${federationNodeId} is already a member`);
        }
        const existing = this.getAllByHandle(handle);
        if (existing.length > 0 && existing[0].entityId !== entityId) {
            throw new Error(`Handle "${handle}" is already taken by a different entity`);
        }
        const member = createCommonwealthMember(name, handle, federationNodeId, federationPublicKey, url, entityId, isFounder, priority);
        this.members.set(member.id, member);
        this.loader.save(member);
        return member;
    }

    setBankAccount(id: string, bankAccountId: string): CommonwealthMember {
        const member = this.members.get(id);
        if (!member) throw new Error(`Member ${id} not found`);
        member.bankAccountId = bankAccountId;
        this.loader.save(member);
        return member;
    }

    setCreditLine(id: string, creditLineKin: number): CommonwealthMember {
        const member = this.members.get(id);
        if (!member) throw new Error(`Member ${id} not found`);
        member.creditLineKin = creditLineKin;
        this.loader.save(member);
        return member;
    }

    setPopulation(id: string, populationCount: number): CommonwealthMember {
        const member = this.members.get(id);
        if (!member) throw new Error(`Member ${id} not found`);
        member.populationCount = populationCount;
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
