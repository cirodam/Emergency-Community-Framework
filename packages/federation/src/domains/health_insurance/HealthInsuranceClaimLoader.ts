import { FileStore } from "@ecf/core";
import { HealthInsuranceClaim, type HealthInsuranceClaimData } from "./HealthInsuranceClaim.js";

export class HealthInsuranceClaimLoader {
    private store: FileStore;

    constructor(dataDir: string) {
        this.store = new FileStore(dataDir);
    }

    save(claim: HealthInsuranceClaim): void {
        this.store.write(claim.id, claim.toData());
    }

    loadAll(): HealthInsuranceClaim[] {
        return this.store.readAll<HealthInsuranceClaimData>().map(d => HealthInsuranceClaim.fromData(d));
    }
}
