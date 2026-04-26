import { FunctionalUnit } from "../../common/domain/FunctionalUnit.js";
import { UnitTemplateRegistry } from "../../common/domain/UnitTemplateRegistry.js";

export class HousingUnitTemplates {
    static register(): void {
        UnitTemplateRegistry.register({
            type:        "housing-committee",
            label:       "Housing Committee",
            description: "Allocates dwellings, manages the waiting list, and resolves housing disputes.",
            factory: () => new FunctionalUnit(
                "Housing Committee",
                "Allocates dwellings, manages the waiting list, and resolves housing disputes.",
                "housing-committee",
            ),
        });

        UnitTemplateRegistry.register({
            type:        "construction-crew",
            label:       "Construction Crew",
            description: "Builds new community structures, performs major renovations, and manages construction projects.",
            factory: () => new FunctionalUnit(
                "Construction Crew",
                "Builds new community structures, performs major renovations, and manages construction projects.",
                "construction-crew",
            ),
        });

        UnitTemplateRegistry.register({
            type:        "maintenance-workshop",
            label:       "Maintenance Workshop",
            description: "Repairs existing structures, stewards tools and materials inventory, and handles emergency fixes.",
            factory: () => new FunctionalUnit(
                "Maintenance Workshop",
                "Repairs existing structures, stewards tools and materials inventory, and handles emergency fixes.",
                "maintenance-workshop",
            ),
        });
    }
}
