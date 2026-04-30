import { BaseLoader } from "@ecf/core";
import type { CommonwealthMember } from "./CommonwealthMember.js";

export class CommonwealthMemberLoader extends BaseLoader<CommonwealthMember, CommonwealthMember> {
    protected serialize(m: CommonwealthMember): CommonwealthMember   { return m; }
    protected deserialize(d: CommonwealthMember): CommonwealthMember { return d; }
}
