import { BaseLoader } from "@ecf/core";
import { Stall } from "./Stall.js";

export class StallLoader extends BaseLoader<Stall, Stall> {
    protected serialize(s: Stall): Stall { return s; }
    protected deserialize(d: Stall): Stall { return d; }
}
