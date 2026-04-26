import { FileStore } from "@ecf/core";
import type { FederationMember } from "./FederationMember.js";

export class FederationMemberLoader {
    private readonly store: FileStore;

    constructor(dataDir: string) {
        this.store = new FileStore(dataDir);
    }

    save(member: FederationMember): void {
        this.store.write(member.id, member);
    }

    load(id: string): FederationMember | null {
        return this.store.read<FederationMember>(id) ?? null;
    }

    loadAll(): FederationMember[] {
        return this.store.readAll<FederationMember>();
    }

    delete(id: string): void {
        this.store.delete(id);
    }
}
