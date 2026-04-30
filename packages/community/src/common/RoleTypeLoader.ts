import { BaseLoader } from "@ecf/core";
import { RoleType, type RoleTypeData } from "./RoleType.js";

export class RoleTypeLoader extends BaseLoader<RoleTypeData, RoleType> {
    protected serialize(r: RoleType): RoleTypeData   { return r.toData(); }
    protected deserialize(d: RoleTypeData): RoleType { return RoleType.restore(d); }
}
