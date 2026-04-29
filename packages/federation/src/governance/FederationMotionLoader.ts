import { FileStore } from "@ecf/core";
import { FederationMotion, type FederationMotionData } from "./FederationMotion.js";

export class FederationMotionLoader {
    private store: FileStore;

    constructor(dataDir: string) {
        this.store = new FileStore(dataDir);
    }

    save(motion: FederationMotion): void {
        this.store.write(motion.id, motion.toData());
    }

    loadAll(): FederationMotion[] {
        return this.store.readAll<FederationMotionData>().map(d => FederationMotion.fromData(d));
    }
}
