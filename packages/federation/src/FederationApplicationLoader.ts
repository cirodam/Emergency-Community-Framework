import { BaseLoader } from "@ecf/core";
import type { FederationApplication } from "./FederationApplication.js";

export class FederationApplicationLoader extends BaseLoader<FederationApplication, FederationApplication> {
    protected serialize(app: FederationApplication): FederationApplication   { return app; }
    protected deserialize(d: FederationApplication): FederationApplication { return d; }
}
