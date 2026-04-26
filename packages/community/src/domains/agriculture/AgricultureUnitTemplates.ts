import { FunctionalUnit } from "../../common/domain/FunctionalUnit.js";
import { UnitTemplateRegistry } from "../../common/domain/UnitTemplateRegistry.js";

export class AgricultureUnitTemplates {
    static register(): void {
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
