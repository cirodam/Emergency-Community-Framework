import { FunctionalUnit } from "../../common/domain/FunctionalUnit.js";
import { UnitTemplateRegistry } from "../../common/domain/UnitTemplateRegistry.js";

export class WaterUnitTemplates {
    static register(): void {
        UnitTemplateRegistry.register({
            type:        "well-and-extraction",
            label:       "Well & Extraction",
            description: "Manages wells, boreholes, springs, and surface water intake points for the community water supply.",
            factory: () => new FunctionalUnit(
                "Well & Extraction",
                "Manages wells, boreholes, springs, and surface water intake points for the community water supply.",
                "well-and-extraction",
            ),
        });

        UnitTemplateRegistry.register({
            type:        "reservoir-and-storage",
            label:       "Reservoir & Storage",
            description: "Operates cisterns, elevated tanks, and reservoir infrastructure to buffer supply and maintain water pressure.",
            factory: () => new FunctionalUnit(
                "Reservoir & Storage",
                "Operates cisterns, elevated tanks, and reservoir infrastructure to buffer supply and maintain water pressure.",
                "reservoir-and-storage",
            ),
        });

        UnitTemplateRegistry.register({
            type:        "irrigation-office",
            label:       "Irrigation Office",
            description: "Plans, installs, and maintains irrigation channels, drip systems, and water scheduling for agricultural land.",
            factory: () => new FunctionalUnit(
                "Irrigation Office",
                "Plans, installs, and maintains irrigation channels, drip systems, and water scheduling for agricultural land.",
                "irrigation-office",
            ),
        });
    }
}
