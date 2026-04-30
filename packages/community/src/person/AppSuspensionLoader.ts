import { FileStore } from "@ecf/core";
import { AppSuspension } from "./AppSuspension.js";

export class AppSuspensionLoader {
    private readonly store: FileStore;

    constructor(dataDir: string) {
        this.store = new FileStore(`${dataDir}/app-suspensions`);
    }

    save(s: AppSuspension): void {
        this.store.write(s.id, s);
    }

    delete(id: string): void {
        this.store.delete(id);
    }

    loadAll(): AppSuspension[] {
        return this.store.readAll<AppSuspension>();
    }
}
