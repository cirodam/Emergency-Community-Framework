import { FunctionalUnit } from "../../common/domain/FunctionalUnit.js";
import { UnitTemplateRegistry } from "../../common/domain/UnitTemplateRegistry.js";

export class DeathcareUnitTemplates {
    static register(): void {
        UnitTemplateRegistry.register({
            type:        "mortuary-service",
            label:       "Mortuary Service",
            description: "Prepares and stores remains with dignity, coordinates death registration, and supports families through the process.",
            factory: () => new FunctionalUnit(
                "Mortuary Service",
                "Prepares and stores remains with dignity, coordinates death registration, and supports families through the process.",
                "mortuary-service",
            ),
        });

        UnitTemplateRegistry.register({
            type:        "burial-ground-office",
            label:       "Burial Ground Office",
            description: "Manages cemetery plots, maintains interment records, and coordinates burial and cremation logistics.",
            factory: () => new FunctionalUnit(
                "Burial Ground Office",
                "Manages cemetery plots, maintains interment records, and coordinates burial and cremation logistics.",
                "burial-ground-office",
            ),
        });

        UnitTemplateRegistry.register({
            type:        "grief-support-circle",
            label:       "Grief Support Circle",
            description: "Provides counselling, communal mourning rituals, and ongoing emotional support for bereaved community members.",
            factory: () => new FunctionalUnit(
                "Grief Support Circle",
                "Provides counselling, communal mourning rituals, and ongoing emotional support for bereaved community members.",
                "grief-support-circle",
            ),
        });
    }
}
