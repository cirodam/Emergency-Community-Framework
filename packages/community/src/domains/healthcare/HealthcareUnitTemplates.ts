import { FunctionalUnit } from "../../common/domain/FunctionalUnit.js";
import { UnitTemplateRegistry } from "../../common/domain/UnitTemplateRegistry.js";

export class HealthcareUnitTemplates {
    static register(): void {
        UnitTemplateRegistry.register({
            type:        "medicine-supply-office",
            label:       "Medicine Supply Office",
            description: "Manages procurement, storage, and distribution of medicines and medical supplies for the community.",
            factory: () => new FunctionalUnit(
                "Medicine Supply Office",
                "Manages procurement, storage, and distribution of medicines and medical supplies for the community.",
                "medicine-supply-office",
            ),
        });

        UnitTemplateRegistry.register({
            type:        "primary-care-clinic",
            label:       "Primary Care Clinic",
            description: "General medical care, preventive health, chronic disease management, and triage for the community.",
            factory: () => new FunctionalUnit(
                "Primary Care Clinic",
                "General medical care, preventive health, chronic disease management, and triage for the community.",
                "primary-care-clinic",
            ),
        });

        UnitTemplateRegistry.register({
            type:        "dental-clinic",
            label:       "Dental Clinic",
            description: "Dental examination, preventive hygiene, restorative treatment, and oral health education for community members.",
            factory: () => new FunctionalUnit(
                "Dental Clinic",
                "Dental examination, preventive hygiene, restorative treatment, and oral health education for community members.",
                "dental-clinic",
            ),
        });
    }
}
