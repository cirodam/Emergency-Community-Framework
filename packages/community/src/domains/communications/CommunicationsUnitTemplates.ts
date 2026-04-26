import { FunctionalUnit } from "../../common/domain/FunctionalUnit.js";
import { UnitTemplateRegistry } from "../../common/domain/UnitTemplateRegistry.js";

export class CommunicationsUnitTemplates {
    static register(): void {
        UnitTemplateRegistry.register({
            type:        "community-radio",
            label:       "Community Radio",
            description: "Operates a broadcast radio station for community news, emergency alerts, and public coordination.",
            factory: () => new FunctionalUnit(
                "Community Radio",
                "Operates a broadcast radio station for community news, emergency alerts, and public coordination.",
                "community-radio",
            ),
        });

        UnitTemplateRegistry.register({
            type:        "mesh-network-office",
            label:       "Mesh Network Office",
            description: "Deploys and maintains a local mesh network providing internet access and intra-community data services.",
            factory: () => new FunctionalUnit(
                "Mesh Network Office",
                "Deploys and maintains a local mesh network providing internet access and intra-community data services.",
                "mesh-network-office",
            ),
        });

        UnitTemplateRegistry.register({
            type:        "postal-service",
            label:       "Postal Service",
            description: "Handles physical message and parcel delivery within the community and to neighbouring settlements.",
            factory: () => new FunctionalUnit(
                "Postal Service",
                "Handles physical message and parcel delivery within the community and to neighbouring settlements.",
                "postal-service",
            ),
        });
    }
}
