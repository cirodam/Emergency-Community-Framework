import { FunctionalUnit } from "../../common/domain/FunctionalUnit.js";
import { UnitTemplateRegistry } from "../../common/domain/UnitTemplateRegistry.js";

export class CourierUnitTemplates {
    static register(): void {
        UnitTemplateRegistry.register({
            type:        "local-delivery-team",
            label:       "Local Delivery Team",
            description: "Handles door-to-door delivery of parcels, mail, and goods to addresses within the community.",
            factory: () => new FunctionalUnit(
                "Local Delivery Team",
                "Handles door-to-door delivery of parcels, mail, and goods to addresses within the community.",
                "local-delivery-team",
            ),
        });

        UnitTemplateRegistry.register({
            type:        "parcel-depot",
            label:       "Parcel Depot",
            description: "Operates the community's central receiving, sorting, and holding hub for inbound and outbound packages.",
            factory: () => new FunctionalUnit(
                "Parcel Depot",
                "Operates the community's central receiving, sorting, and holding hub for inbound and outbound packages.",
                "parcel-depot",
            ),
        });

        UnitTemplateRegistry.register({
            type:        "inter-community-courier",
            label:       "Inter-Community Courier",
            description: "Runs scheduled delivery routes carrying packages and correspondence between this community and neighbouring settlements.",
            factory: () => new FunctionalUnit(
                "Inter-Community Courier",
                "Runs scheduled delivery routes carrying packages and correspondence between this community and neighbouring settlements.",
                "inter-community-courier",
            ),
        });
    }
}
