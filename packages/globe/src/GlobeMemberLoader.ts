import { BaseLoader } from "@ecf/core";
import type { GlobeMember } from "./GlobeMember.js";

export class GlobeMemberLoader extends BaseLoader<GlobeMember, GlobeMember> {
    protected serialize(m: GlobeMember): GlobeMember   { return m; }
    protected deserialize(d: GlobeMember): GlobeMember { return d; }
}
