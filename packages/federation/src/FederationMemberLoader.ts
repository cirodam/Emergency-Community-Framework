import { BaseLoader } from "@ecf/core";
import type { FederationMember } from "./FederationMember.js";

export class FederationMemberLoader extends BaseLoader<FederationMember, FederationMember> {
    protected serialize(m: FederationMember): FederationMember   { return m; }
    protected deserialize(d: FederationMember): FederationMember { return d; }
}
