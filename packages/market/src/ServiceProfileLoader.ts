import { BaseLoader } from "@ecf/core";
import { ServiceProfile } from "./ServiceProfile.js";

export class ServiceProfileLoader extends BaseLoader<ServiceProfile, ServiceProfile> {
    protected serialize(p: ServiceProfile): ServiceProfile { return p; }
    protected deserialize(d: ServiceProfile): ServiceProfile { return d; }
}
