import { FileStore } from "@ecf/core";
import type { CommonwealthMember } from "./CommonwealthMember.js";

export class CommonwealthMemberLoader {
    private readonly store: FileStore;

    constructor(dataDir: string) {
        this.store = new FileStore(dataDir);
    }

    save(member: CommonwealthMember): void {
        this.store.write(member.id, member);
    }

    load(id: string): CommonwealthMember | null {
        return this.store.read<CommonwealthMember>(id) ?? null;
    }

    loadAll(): CommonwealthMember[] {
        return this.store.readAll<CommonwealthMember>();
    }

    delete(id: string): void {
        this.store.delete(id);
    }
}
