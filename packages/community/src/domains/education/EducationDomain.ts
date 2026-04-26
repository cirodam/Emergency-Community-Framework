import { FunctionalDomain } from "../../common/domain/FunctionalDomain.js";

export const EDUCATION_DOMAIN_ID = "ecf-domain-education-000000018";

/**
 * Education Domain — coordinates community learning and knowledge transmission.
 *
 * Functional units in this domain (instantiated from templates):
 *   - primary-school         Foundational literacy, numeracy, and civic education (ages 6–12)
 *   - secondary-school       Advanced academic and vocational education (ages 12–18)
 *   - library                Community knowledge repository, reading, and research
 *   - apprenticeship-office  Coordinates trade apprenticeships and skills-transfer programmes
 */
export class EducationDomain extends FunctionalDomain {
    private static instance: EducationDomain;

    private constructor() {
        super(
            "Education",
            "Coordinates community learning from primary schooling through vocational training and lifelong knowledge access.",
            EDUCATION_DOMAIN_ID,
        );
    }

    static getInstance(): EducationDomain {
        if (!EducationDomain.instance) EducationDomain.instance = new EducationDomain();
        return EducationDomain.instance;
    }
}
