import { BaseLoader } from "@ecf/core";
import { Motion, type MotionData } from "./Motion.js";

export class MotionLoader extends BaseLoader<MotionData, Motion> {
    protected serialize(m: Motion): MotionData   { return m.toData(); }
    protected deserialize(d: MotionData): Motion { return Motion.fromData(d); }
}
