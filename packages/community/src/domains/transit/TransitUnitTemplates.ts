import { FunctionalUnit } from "../../common/domain/FunctionalUnit.js";
import { UnitTemplateRegistry } from "../../common/domain/UnitTemplateRegistry.js";

export class TransitUnitTemplates {
    static register(): void {
        UnitTemplateRegistry.register({
            type:        "bus-and-shuttle-service",
            label:       "Bus & Shuttle Service",
            description: "Operates scheduled bus or shuttle routes connecting residential areas, workplaces, clinics, and key community facilities.",
            factory: () => new FunctionalUnit(
                "Bus & Shuttle Service",
                "Operates scheduled bus or shuttle routes connecting residential areas, workplaces, clinics, and key community facilities.",
                "bus-and-shuttle-service",
            ),
        });

        UnitTemplateRegistry.register({
            type:        "cycling-office",
            label:       "Cycling Office",
            description: "Manages a shared bicycle fleet, maintains cycling paths, and promotes active transport across the community.",
            factory: () => new FunctionalUnit(
                "Cycling Office",
                "Manages a shared bicycle fleet, maintains cycling paths, and promotes active transport across the community.",
                "cycling-office",
            ),
        });

        UnitTemplateRegistry.register({
            type:        "transport-dispatch",
            label:       "Transport Dispatch",
            description: "Coordinates on-demand vehicle trips, inter-community travel, and emergency patient transport for community members.",
            factory: () => new FunctionalUnit(
                "Transport Dispatch",
                "Coordinates on-demand vehicle trips, inter-community travel, and emergency patient transport for community members.",
                "transport-dispatch",
            ),
        });
    }
}
