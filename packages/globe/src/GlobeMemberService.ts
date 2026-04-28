import { createGlobeMember, type GlobeMember } from "./GlobeMember.js";
import type { GlobeMemberLoader } from "./GlobeMemberLoader.js";

export class GlobeMemberService {
    private static instance: GlobeMemberService;
    private loader!: GlobeMemberLoader;
    private members = new Map<string, GlobeMember>();

    private constructor() {}

    static getInstance(): GlobeMemberService {
        if (!GlobeMemberService.instance) {
            GlobeMemberService.instance = new GlobeMemberService();
        }
        return GlobeMemberService.instance;
    }

    init(loader: GlobeMemberLoader): void {
        this.loader = loader;
        for (const m of loader.loadAll()) {
            this.members.set(m.id, m);
        }
        console.log(`[GlobeMemberService] loaded ${this.members.size} member(s)`);
    }

    getAll(): GlobeMember[] {
        return [...this.members.values()];
    }

    getById(id: string): GlobeMember | undefined {
        return this.members.get(id);
    }

    getByNodeId(commonwealthNodeId: string): GlobeMember | undefined {
        for (const m of this.members.values()) {
            if (m.commonwealthNodeId === commonwealthNodeId) return m;
        }
        return undefined;
    }

    getByPublicKey(commonwealthPublicKey: string): GlobeMember | undefined {
        for (const m of this.members.values()) {
            if (m.commonwealthPublicKey === commonwealthPublicKey) return m;
        }
        return undefined;
    }

    getByHandle(handle: string): GlobeMember | undefined {
        return this.getAllByHandle(handle)[0];
    }

    getAllByHandle(handle: string): GlobeMember[] {
        return [...this.members.values()]
            .filter(m => m.handle === handle)
            .sort((a, b) => a.priority - b.priority);
    }

    add(
        name: string,
        handle: string,
        commonwealthNodeId: string,
        commonwealthPublicKey: string,
        url: string,
        entityId: string,
        isFounder = false,
        priority  = 1,
    ): GlobeMember {
        if (this.getByNodeId(commonwealthNodeId)) {
            throw new Error(`Commonwealth node ${commonwealthNodeId} is already a member`);
        }
        const existing = this.getAllByHandle(handle);
        if (existing.length > 0 && existing[0].entityId !== entityId) {
            throw new Error(`Handle "${handle}" is already taken by a different entity`);
        }
        const member = createGlobeMember(name, handle, commonwealthNodeId, commonwealthPublicKey, url, entityId, isFounder, priority);
        this.members.set(member.id, member);
        this.loader.save(member);
        return member;
    }

    setBankAccount(id: string, bankAccountId: string): GlobeMember {
        const member = this.members.get(id);
        if (!member) throw new Error(`Member ${id} not found`);
        member.bankAccountId = bankAccountId;
        this.loader.save(member);
        return member;
    }

    setCreditLine(id: string, creditLineKin: number): GlobeMember {
        const member = this.members.get(id);
        if (!member) throw new Error(`Member ${id} not found`);
        member.creditLineKin = creditLineKin;
        this.loader.save(member);
        return member;
    }

    setPopulation(id: string, populationCount: number): GlobeMember {
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
