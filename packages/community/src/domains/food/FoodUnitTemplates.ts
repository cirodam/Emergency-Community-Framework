import { FunctionalUnit } from "../../common/domain/FunctionalUnit.js";
import { UnitTemplateRegistry } from "../../common/domain/UnitTemplateRegistry.js";

/**
 * Unit templates for the Food domain.
 *
 * Call FoodUnitTemplates.register() once at startup (before any API requests).
 * After registration, units can be instantiated by type via:
 *   UnitTemplateRegistry.create("community-kitchen")
 *   UnitTemplateRegistry.create("grain-mill")
 */
export class FoodUnitTemplates {
    static register(): void {
        UnitTemplateRegistry.register({
            type:        "food-supply-office",
            label:       "Food Supply Office",
            description: "Central office coordinating food procurement, storage, and distribution for the community.",
            factory: () => new FunctionalUnit(
                "Food Supply Office",
                "Central office coordinating food procurement, storage, and distribution for the community.",
                "food-supply-office",
            ),
        });

        UnitTemplateRegistry.register({
            type:        "community-kitchen",
            label:       "Community Kitchen",
            description: "Shared kitchen space for food preparation and cooking. Handles raw ingredient processing, meal preparation, and food preservation for the community.",
            factory: () => new FunctionalUnit(
                "Community Kitchen",
                "Shared kitchen space for food preparation and cooking. Handles raw ingredient processing, meal preparation, and food preservation for the community.",
                "community-kitchen",
            ),
        });

        UnitTemplateRegistry.register({
            type:        "grain-mill",
            label:       "Grain Mill",
            description: "Processes whole grains into flour, meal, or hulled grains. Maintains grain storage and manages milling schedules for the community.",
            factory: () => new FunctionalUnit(
                "Grain Mill",
                "Processes whole grains into flour, meal, or hulled grains. Maintains grain storage and manages milling schedules for the community.",
                "grain-mill",
            ),
        });
    }
}
