import { BaseLoader } from "@ecf/core";
import type { CommonwealthApplication } from "./CommonwealthApplication.js";

export class CommonwealthApplicationLoader extends BaseLoader<CommonwealthApplication, CommonwealthApplication> {
    protected serialize(app: CommonwealthApplication): CommonwealthApplication   { return app; }
    protected deserialize(d: CommonwealthApplication): CommonwealthApplication { return d; }
}
