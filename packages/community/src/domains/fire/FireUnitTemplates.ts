import { FunctionalUnit } from "../../common/domain/FunctionalUnit.js";
import { UnitTemplateRegistry } from "../../common/domain/UnitTemplateRegistry.js";

export class FireUnitTemplates {
    static register(): void {
        UnitTemplateRegistry.register({
            type:        "fire-station",
            label:       "Fire Station",
            description: "Staffed response unit that suppresses structural and wildland fires, performs rescues, and responds to hazmat incidents.",
            factory: () => new FunctionalUnit(
                "Fire Station",
                "Staffed response unit that suppresses structural and wildland fires, performs rescues, and responds to hazmat incidents.",
                "fire-station",
            ),
        });

        UnitTemplateRegistry.register({
            type:        "fire-prevention-office",
            label:       "Fire Prevention Office",
            description: "Conducts building inspections, community fire-safety education, controlled burns, and fuel-load reduction programmes.",
            factory: () => new FunctionalUnit(
                "Fire Prevention Office",
                "Conducts building inspections, community fire-safety education, controlled burns, and fuel-load reduction programmes.",
                "fire-prevention-office",
            ),
        });
    }
}
