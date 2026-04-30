import { BaseLoader } from "@ecf/core";
import type { GlobeApplication } from "./GlobeApplication.js";

export class GlobeApplicationLoader extends BaseLoader<GlobeApplication, GlobeApplication> {
    protected serialize(app: GlobeApplication): GlobeApplication   { return app; }
    protected deserialize(d: GlobeApplication): GlobeApplication { return d; }
}
