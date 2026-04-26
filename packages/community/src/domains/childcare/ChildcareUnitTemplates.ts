import { FunctionalUnit } from "../../common/domain/FunctionalUnit.js";
import { UnitTemplateRegistry } from "../../common/domain/UnitTemplateRegistry.js";

export class ChildcareUnitTemplates {
    static register(): void {
        UnitTemplateRegistry.register({
            type:        "nursery",
            label:       "Nursery",
            description: "Provides safe, nurturing care for infants and toddlers aged 0–3, supporting feeding, sleep, and early development.",
            factory: () => new FunctionalUnit(
                "Nursery",
                "Provides safe, nurturing care for infants and toddlers aged 0–3, supporting feeding, sleep, and early development.",
                "nursery",
            ),
        });

        UnitTemplateRegistry.register({
            type:        "kindergarten",
            label:       "Kindergarten",
            description: "Delivers early childhood education, structured play, and socialisation for children aged 3–6.",
            factory: () => new FunctionalUnit(
                "Kindergarten",
                "Delivers early childhood education, structured play, and socialisation for children aged 3–6.",
                "kindergarten",
            ),
        });

        UnitTemplateRegistry.register({
            type:        "after-school-club",
            label:       "After-School Club",
            description: "Provides supervised activities, creative projects, and homework support for school-age children outside school hours.",
            factory: () => new FunctionalUnit(
                "After-School Club",
                "Provides supervised activities, creative projects, and homework support for school-age children outside school hours.",
                "after-school-club",
            ),
        });
    }
}
