import { FunctionalUnit } from "../../common/domain/FunctionalUnit.js";
import { UnitTemplateRegistry } from "../../common/domain/UnitTemplateRegistry.js";

export class SanitationUnitTemplates {
    static register(): void {
        UnitTemplateRegistry.register({
            type:        "water-treatment-plant",
            label:       "Water Treatment Plant",
            description: "Purifies drinking water, manages wastewater treatment, and monitors water quality for the community.",
            factory: () => new FunctionalUnit(
                "Water Treatment Plant",
                "Purifies drinking water, manages wastewater treatment, and monitors water quality for the community.",
                "water-treatment-plant",
            ),
        });

        UnitTemplateRegistry.register({
            type:        "waste-collection-team",
            label:       "Waste Collection Team",
            description: "Collects, sorts, and routes solid waste for disposal, recycling, or repurposing.",
            factory: () => new FunctionalUnit(
                "Waste Collection Team",
                "Collects, sorts, and routes solid waste for disposal, recycling, or repurposing.",
                "waste-collection-team",
            ),
        });

        UnitTemplateRegistry.register({
            type:        "composting-facility",
            label:       "Composting Facility",
            description: "Processes organic household and agricultural waste into compost for use by the Agriculture domain.",
            factory: () => new FunctionalUnit(
                "Composting Facility",
                "Processes organic household and agricultural waste into compost for use by the Agriculture domain.",
                "composting-facility",
            ),
        });
    }
}
