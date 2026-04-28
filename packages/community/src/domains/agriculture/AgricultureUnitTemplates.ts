import { FunctionalUnit } from "../../common/domain/FunctionalUnit.js";
import { UnitTemplateRegistry } from "../../common/domain/UnitTemplateRegistry.js";

export class AgricultureUnitTemplates {
    static register(): void {
        UnitTemplateRegistry.register({
            type:        "farm-coordination-office",
            label:       "Farm Coordination Office",
            description: "Coordinates land allocation, planting schedules, shared equipment, and harvest logistics across community farms and individual growers.",
            factory: () => new FunctionalUnit(
                "Farm Coordination Office",
                "Coordinates land allocation, planting schedules, shared equipment, and harvest logistics across community farms and individual growers.",
                "farm-coordination-office",
            ),
        });

        UnitTemplateRegistry.register({
            type:        "seed-library",
            label:       "Seed Library",
            description: "Community-managed seed saving, cataloguing, and lending. Maintains genetic diversity, tracks seed provenance and viability, and coordinates seasonal lending to community growers.",
            factory: () => new FunctionalUnit(
                "Seed Library",
                "Community-managed seed saving, cataloguing, and lending. Maintains genetic diversity, tracks seed provenance and viability, and coordinates seasonal lending to community growers.",
                "seed-library",
            ),
        });
    }
}
