import { FunctionalUnit } from "../../common/domain/FunctionalUnit.js";
import { UnitTemplateRegistry } from "../../common/domain/UnitTemplateRegistry.js";

export class MediationUnitTemplates {
    static register(): void {
        UnitTemplateRegistry.register({
            type:        "mediation-panel",
            label:       "Mediation Panel",
            description: "A small panel of trained community mediators who facilitate structured conversations between parties in conflict. Mediators hold space for mutual understanding — they do not rule or impose outcomes. Engagements are confidential. If mediation fails or a party refuses, the matter may be raised as a formal assembly motion.",
            factory: () => new FunctionalUnit(
                "Mediation Panel",
                "A small panel of trained community mediators who facilitate structured conversations between parties in conflict. Mediators hold space for mutual understanding — they do not rule or impose outcomes. Engagements are confidential. If mediation fails or a party refuses, the matter may be raised as a formal assembly motion.",
                "mediation-panel",
            ),
        });

        UnitTemplateRegistry.register({
            type:        "restorative-circle-team",
            label:       "Restorative Circle Team",
            description: "Facilitates restorative circles — structured group processes that bring together those harmed, those who caused harm, and affected community members to collectively determine how to repair the harm. Used for more serious conflicts where bilateral mediation is insufficient.",
            factory: () => new FunctionalUnit(
                "Restorative Circle Team",
                "Facilitates restorative circles — structured group processes that bring together those harmed, those who caused harm, and affected community members to collectively determine how to repair the harm. Used for more serious conflicts where bilateral mediation is insufficient.",
                "restorative-circle-team",
            ),
        });
    }
}
