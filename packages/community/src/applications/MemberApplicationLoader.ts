import { BaseLoader } from "@ecf/core";
import { MemberApplication, ApplicationData } from "./MemberApplication.js";

export class MemberApplicationLoader extends BaseLoader<ApplicationData, MemberApplication> {
    protected serialize(app: MemberApplication): ApplicationData          { return app.toData(); }
    protected deserialize(d: ApplicationData): MemberApplication { return MemberApplication.restore(d); }
}
