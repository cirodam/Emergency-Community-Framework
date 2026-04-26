import { FunctionalUnit } from "../../common/domain/FunctionalUnit.js";
import { UnitTemplateRegistry } from "../../common/domain/UnitTemplateRegistry.js";

export class EducationUnitTemplates {
    static register(): void {
        UnitTemplateRegistry.register({
            type:        "primary-school",
            label:       "Primary School",
            description: "Delivers foundational literacy, numeracy, science, and civic education for children aged 6–12.",
            factory: () => new FunctionalUnit(
                "Primary School",
                "Delivers foundational literacy, numeracy, science, and civic education for children aged 6–12.",
                "primary-school",
            ),
        });

        UnitTemplateRegistry.register({
            type:        "secondary-school",
            label:       "Secondary School",
            description: "Provides advanced academic subjects and vocational pathways for young people aged 12–18.",
            factory: () => new FunctionalUnit(
                "Secondary School",
                "Provides advanced academic subjects and vocational pathways for young people aged 12–18.",
                "secondary-school",
            ),
        });

        UnitTemplateRegistry.register({
            type:        "library",
            label:       "Library",
            description: "Maintains the community's collection of books, documents, and digital resources for research, reading, and lifelong learning.",
            factory: () => new FunctionalUnit(
                "Library",
                "Maintains the community's collection of books, documents, and digital resources for research, reading, and lifelong learning.",
                "library",
            ),
        });

        UnitTemplateRegistry.register({
            type:        "apprenticeship-office",
            label:       "Apprenticeship Office",
            description: "Coordinates structured trade apprenticeships and skills-transfer programmes pairing learners with experienced community members.",
            factory: () => new FunctionalUnit(
                "Apprenticeship Office",
                "Coordinates structured trade apprenticeships and skills-transfer programmes pairing learners with experienced community members.",
                "apprenticeship-office",
            ),
        });
    }
}
