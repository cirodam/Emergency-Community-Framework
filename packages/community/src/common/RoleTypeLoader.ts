import { FileStore } from "@ecf/core";
import { RoleType, type RoleTypeData } from "./RoleType.js";

export class RoleTypeLoader {
    private readonly store: FileStore;

    constructor(dataDir: string) {
        this.store = new FileStore(dataDir);
    }

    save(roleType: RoleType): void {
        this.store.write(roleType.id, roleType.toData());
    }

    loadAll(): RoleType[] {
        return this.store.readAll<RoleTypeData>().map(RoleType.restore);
    }

    delete(id: string): boolean {
        return this.store.delete(id);
    }
}
