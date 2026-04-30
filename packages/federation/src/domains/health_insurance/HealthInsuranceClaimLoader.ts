import { BaseLoader } from "@ecf/core";
import { HealthInsuranceClaim, type HealthInsuranceClaimData } from "./HealthInsuranceClaim.js";

export class HealthInsuranceClaimLoader extends BaseLoader<HealthInsuranceClaimData, HealthInsuranceClaim> {
    protected serialize(c: HealthInsuranceClaim): HealthInsuranceClaimData   { return c.toData(); }
    protected deserialize(d: HealthInsuranceClaimData): HealthInsuranceClaim { return HealthInsuranceClaim.fromData(d); }
}
