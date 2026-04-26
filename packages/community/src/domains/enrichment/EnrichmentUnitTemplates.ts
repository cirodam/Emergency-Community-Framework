import { FunctionalUnit } from "../../common/domain/FunctionalUnit.js";
import { UnitTemplateRegistry } from "../../common/domain/UnitTemplateRegistry.js";

export class EnrichmentUnitTemplates {
    static register(): void {
        UnitTemplateRegistry.register({
            type:        "events-team",
            label:       "Events Team",
            description: "Plans and runs community gatherings, seasonal festivals, ceremonies, markets, and public celebrations.",
            factory: () => new FunctionalUnit(
                "Events Team",
                "Plans and runs community gatherings, seasonal festivals, ceremonies, markets, and public celebrations.",
                "events-team",
            ),
        });

        UnitTemplateRegistry.register({
            type:        "sports-and-recreation",
            label:       "Sports & Recreation",
            description: "Manages sports fields, courts, and equipment; organises leagues, fitness programmes, and outdoor recreational activities.",
            factory: () => new FunctionalUnit(
                "Sports & Recreation",
                "Manages sports fields, courts, and equipment; organises leagues, fitness programmes, and outdoor recreational activities.",
                "sports-and-recreation",
            ),
        });

        UnitTemplateRegistry.register({
            type:        "arts-and-culture",
            label:       "Arts & Culture",
            description: "Supports music, visual arts, theatre, dance, storytelling, and other cultural expression within the community.",
            factory: () => new FunctionalUnit(
                "Arts & Culture",
                "Supports music, visual arts, theatre, dance, storytelling, and other cultural expression within the community.",
                "arts-and-culture",
            ),
        });
    }
}
