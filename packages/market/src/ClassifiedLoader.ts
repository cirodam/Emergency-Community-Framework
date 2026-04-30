import { BaseLoader } from "@ecf/core";
import { Classified } from "./Classified.js";

export class ClassifiedLoader extends BaseLoader<Classified, Classified> {
    protected serialize(c: Classified): Classified { return c; }
    protected deserialize(d: Classified): Classified { return d; }
}
