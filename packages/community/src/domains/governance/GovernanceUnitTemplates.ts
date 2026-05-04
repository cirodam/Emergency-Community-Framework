import { FunctionalUnit } from "../../common/domain/FunctionalUnit.js";
import { UnitTemplateRegistry } from "../../common/domain/UnitTemplateRegistry.js";

export class GovernanceUnitTemplates {
    static register(): void {
        UnitTemplateRegistry.register({
            type:        "assembly",
            label:       "Assembly",
            description: "The seated community assembly drawn by sortition each term. Deliberates on motions, records outcomes, and upholds procedural rules.",
            factory: () => new FunctionalUnit(
                "Assembly",
                "The seated community assembly drawn by sortition each term. Deliberates on motions, records outcomes, and upholds procedural rules.",
                "assembly",
            ),
        });
    }
}
