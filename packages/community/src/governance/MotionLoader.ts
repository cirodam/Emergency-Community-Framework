import { FileStore } from "@ecf/core";
import { Motion, type MotionData } from "./Motion.js";

export class MotionLoader {
    private store: FileStore;

    constructor(dataDir: string) {
        this.store = new FileStore(dataDir);
    }

    save(motion: Motion): void {
        this.store.write(motion.id, motion.toData());
    }

    loadAll(): Motion[] {
        const records = this.store.readAll<MotionData>();
        return records.map(d => Motion.fromData(d));
    }
}
