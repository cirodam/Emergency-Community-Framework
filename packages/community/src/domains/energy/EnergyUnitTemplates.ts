import { FunctionalUnit } from "../../common/domain/FunctionalUnit.js";
import { UnitTemplateRegistry } from "../../common/domain/UnitTemplateRegistry.js";

export class EnergyUnitTemplates {
    static register(): void {
        UnitTemplateRegistry.register({
            type:        "electricity-office",
            label:       "Electricity Office",
            description: "Manages electricity generation, battery storage, grid distribution, and load balancing for the community.",
            factory: () => new FunctionalUnit(
                "Electricity Office",
                "Manages electricity generation, battery storage, grid distribution, and load balancing for the community.",
                "electricity-office",
            ),
        });

        UnitTemplateRegistry.register({
            type:        "liquid-fuel-office",
            label:       "Liquid Fuel Office",
            description: "Manages production or procurement, storage, and rationing of liquid fuels including biodiesel and petrol.",
            factory: () => new FunctionalUnit(
                "Liquid Fuel Office",
                "Manages production or procurement, storage, and rationing of liquid fuels including biodiesel and petrol.",
                "liquid-fuel-office",
            ),
        });
    }
}
