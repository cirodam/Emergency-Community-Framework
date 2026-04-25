import { FileStore } from "@ecf/core";
import { Constitution, ConstitutionDocument } from "./Constitution.js";

const FILE_KEY = "constitution";

export class ConstitutionLoader {
    private readonly store: FileStore;

    constructor(dataDir: string) {
        this.store = new FileStore(dataDir);
    }

    /** Load the persisted document into the Constitution singleton, or seed defaults on first boot. */
    load(): void {
        const existing = this.store.read<ConstitutionDocument>(FILE_KEY);
        if (existing) {
            Constitution.getInstance().load(existing);
        } else {
            this.save();
        }
    }

    save(): void {
        this.store.write(FILE_KEY, Constitution.getInstance().toDocument());
    }
}
