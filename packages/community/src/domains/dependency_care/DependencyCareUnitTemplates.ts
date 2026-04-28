import { FunctionalUnit } from "../../common/domain/FunctionalUnit.js";
import { UnitTemplateRegistry } from "../../common/domain/UnitTemplateRegistry.js";

export class DependencyCareUnitTemplates {
    static register(): void {
        UnitTemplateRegistry.register({
            type:        "community-outreach-team",
            label:       "Community Outreach Team",
            description: "Identifies at-risk, isolated, or vulnerable community members — including elderly, disabled, and food-insecure individuals — and coordinates delivery of food, medicine, and care services to them.",
            factory: () => new FunctionalUnit(
                "Community Outreach Team",
                "Identifies at-risk, isolated, or vulnerable community members — including elderly, disabled, and food-insecure individuals — and coordinates delivery of food, medicine, and care services to them.",
                "community-outreach-team",
            ),
        });

        UnitTemplateRegistry.register({
            type:        "elder-care-home",
            label:       "Elder Care Home",
            description: "Provides residential and day care for older adults, including meals, mobility support, social activities, and health monitoring.",
            factory: () => new FunctionalUnit(
                "Elder Care Home",
                "Provides residential and day care for older adults, including meals, mobility support, social activities, and health monitoring.",
                "elder-care-home",
            ),
        });

        UnitTemplateRegistry.register({
            type:        "disability-support",
            label:       "Disability Support",
            description: "Delivers personal assistance, adaptive equipment, accessible environment advocacy, and social inclusion services for disabled members.",
            factory: () => new FunctionalUnit(
                "Disability Support",
                "Delivers personal assistance, adaptive equipment, accessible environment advocacy, and social inclusion services for disabled members.",
                "disability-support",
            ),
        });

        UnitTemplateRegistry.register({
            type:        "palliative-care-unit",
            label:       "Palliative Care Unit",
            description: "Provides comfort-focused care, pain management, and emotional support for members with life-limiting or terminal conditions.",
            factory: () => new FunctionalUnit(
                "Palliative Care Unit",
                "Provides comfort-focused care, pain management, and emotional support for members with life-limiting or terminal conditions.",
                "palliative-care-unit",
            ),
        });
    }
}
