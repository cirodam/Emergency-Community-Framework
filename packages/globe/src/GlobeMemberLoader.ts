import { FileStore } from "@ecf/core";
import type { GlobeMember } from "./GlobeMember.js";

export class GlobeMemberLoader {
    private readonly store: FileStore;

    constructor(dataDir: string) {
        this.store = new FileStore(dataDir);
    }

    save(member: GlobeMember): void {
        this.store.write(member.id, member);
    }

    load(id: string): GlobeMember | null {
        return this.store.read<GlobeMember>(id) ?? null;
    }

    loadAll(): GlobeMember[] {
        return this.store.readAll<GlobeMember>();
    }

    delete(id: string): void {
        this.store.delete(id);
    }
}
