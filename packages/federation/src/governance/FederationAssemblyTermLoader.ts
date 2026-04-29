import { FileStore } from "@ecf/core";
import { FederationAssemblyTerm, type FederationAssemblyTermData } from "./FederationAssemblyTerm.js";

export class FederationAssemblyTermLoader {
    private store: FileStore;

    constructor(dataDir: string) {
        this.store = new FileStore(dataDir);
    }

    save(term: FederationAssemblyTerm): void {
        this.store.write(term.id, term.toData());
    }

    loadAll(): FederationAssemblyTerm[] {
        return this.store.readAll<FederationAssemblyTermData>()
            .map(d => FederationAssemblyTerm.fromData(d))
            .sort((a, b) => b.termNumber - a.termNumber);
    }
}
