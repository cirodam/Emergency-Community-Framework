import { BaseLoader } from "@ecf/core";
import { FederationAssemblyTerm, type FederationAssemblyTermData } from "./FederationAssemblyTerm.js";

export class FederationAssemblyTermLoader extends BaseLoader<FederationAssemblyTermData, FederationAssemblyTerm> {
    protected serialize(term: FederationAssemblyTerm): FederationAssemblyTermData   { return term.toData(); }
    protected deserialize(d: FederationAssemblyTermData): FederationAssemblyTerm { return FederationAssemblyTerm.fromData(d); }

    override loadAll(): FederationAssemblyTerm[] {
        return super.loadAll().sort((a, b) => b.termNumber - a.termNumber);
    }
}
