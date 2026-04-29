import { FunctionalDomain } from "../../common/domain/FunctionalDomain.js";

export const HEALTHCARE_DOMAIN_ID = "ecf-domain-healthcare-000000008";

export interface HealthcareStaffingRole {
    /** Recommended headcount at this population. */
    recommended: number;
    /** Population per one of this role (the ratio denominator). */
    ratioPerPerson: number;
}

export interface HealthcareStaffingHeuristic {
    /**
     * General practitioner / doctor — handles diagnosis, chronic disease
     * management, referrals, and triage. The backbone of primary care.
     * Ratio: 1 per 1,000 (WHO minimum for primary care systems).
     */
    gp:           HealthcareStaffingRole;
    /**
     * Nurse / nurse practitioner — delivers most day-to-day care: wound
     * management, chronic disease monitoring, vaccinations, health education.
     * Ratio: 1 per 300 (higher density for primary-care-only communities
     * where nurses carry more load than in hospital-backed systems).
     */
    nurse:        HealthcareStaffingRole;
    /**
     * Dentist — examinations, preventive hygiene, restorative work.
     * Ratio: 1 per 2,000. Small communities will often share a dentist
     * who rotates between communities in the federation.
     */
    dentist:      HealthcareStaffingRole;
    /**
     * Mental health worker — counselling, crisis support, addiction support.
     * Ratio: 1 per 1,500. Crisis and displacement situations increase need
     * significantly; treat this as a floor, not a ceiling.
     */
    mentalHealth: HealthcareStaffingRole;
    /**
     * Paramedic / emergency medical technician — responds to acute events,
     * stabilises patients, transports to federation-level hospitals.
     * Ratio: 1 per 1,000.
     */
    paramedic:    HealthcareStaffingRole;
    /**
     * Midwife — prenatal care, birth attendance, postnatal support.
     * Ratio: 1 per 1,000. Communities with many young families should
     * scale this up toward 1 per 500.
     */
    midwife:      HealthcareStaffingRole;
}

/**
 * Healthcare Domain — coordinates community health services.
 *
 * Functional units in this domain (instantiated from templates):
 *   - medicine-supply-office  Procurement, storage, and distribution of medicines (default)
 *   - primary-care-clinic     General medical care and preventive health (default)
 *   - dental-clinic           Dental examination, treatment, and hygiene
 */
export class HealthcareDomain extends FunctionalDomain {
    private static instance: HealthcareDomain;

    private constructor() {
        super(
            "Healthcare",
            "Coordinates community health services including primary care and dental care.",
            HEALTHCARE_DOMAIN_ID,
        );
    }

    static getInstance(): HealthcareDomain {
        if (!HealthcareDomain.instance) HealthcareDomain.instance = new HealthcareDomain();
        return HealthcareDomain.instance;
    }

    /**
     * Returns the recommended minimum staffing levels for a community of
     * the given population. Based on WHO primary care ratios, adjusted for
     * communities that handle only primary and preventive care (hospitals and
     * specialist care are a federation-level responsibility).
     *
     * These are advisory — the community decides its actual staffing via the
     * budget and role system. Use this as a prompt when reviewing the healthcare
     * domain budget.
     */
    static staffingHeuristic(population: number): HealthcareStaffingHeuristic {
        const recommend = (ratioPerPerson: number): HealthcareStaffingRole => ({
            recommended:    Math.max(1, Math.ceil(population / ratioPerPerson)),
            ratioPerPerson,
        });

        return {
            gp:           recommend(1_000),
            nurse:        recommend(300),
            dentist:      recommend(2_000),
            mentalHealth: recommend(1_500),
            paramedic:    recommend(1_000),
            midwife:      recommend(1_000),
        };
    }
}
