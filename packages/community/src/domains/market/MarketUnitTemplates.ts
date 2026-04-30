import { FunctionalUnit } from "../../common/domain/FunctionalUnit.js";
import { UnitTemplateRegistry } from "../../common/domain/UnitTemplateRegistry.js";

/**
 * Unit templates for the Market domain.
 *
 * Call MarketUnitTemplates.register() once at startup (before any API requests).
 * After registration, units can be instantiated by type via:
 *   UnitTemplateRegistry.create("marketplace")
 */
export class MarketUnitTemplates {
    static register(): void {
        UnitTemplateRegistry.register({
            type:        "marketplace",
            label:       "Marketplace",
            description: "A physical marketplace where community members and outside traders exchange goods and surplus produce. Each marketplace has a dedicated coordinator responsible for scheduling, vendor relations, and fair exchange.",
            factory: () => new FunctionalUnit(
                "Marketplace",
                "A physical marketplace where community members and outside traders exchange goods and surplus produce. Each marketplace has a dedicated coordinator responsible for scheduling, vendor relations, and fair exchange.",
                "marketplace",
            ),
        });
    }
}
