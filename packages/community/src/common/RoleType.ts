import { randomUUID } from "crypto";

export interface RoleTypeData {
    id: string;
    title: string;
    description: string;
    defaultKinPerMonth: number;
    preferredUnitTypes?: string[];
}

/**
 * A role type is an entry in the community's role bank — a catalog of
 * occupational roles that functional units can draw from when staffing.
 * e.g. "Nurse", "Firefighter", "Teacher", "Doctor".
 *
 * Role types are the template; CommunityRole instances are the actual
 * slots within a specific unit that can be filled by members.
 */
export class RoleType {
    readonly id: string;
    title: string;
    description: string;
    defaultKinPerMonth: number;
    /** Unit types this role is most relevant to — used to sort the "From role type" dropdown. */
    preferredUnitTypes: string[];

    constructor(
        title: string,
        description: string = "",
        defaultKinPerMonth: number = 0,
        id?: string,
        preferredUnitTypes: string[] = [],
    ) {
        this.id = id ?? randomUUID();
        this.title = title;
        this.description = description;
        this.defaultKinPerMonth = defaultKinPerMonth;
        this.preferredUnitTypes = preferredUnitTypes;
    }

    toData(): RoleTypeData {
        return {
            id:                 this.id,
            title:              this.title,
            description:        this.description,
            defaultKinPerMonth: this.defaultKinPerMonth,
            preferredUnitTypes: this.preferredUnitTypes,
        };
    }

    static restore(data: RoleTypeData): RoleType {
        return new RoleType(data.title, data.description, data.defaultKinPerMonth, data.id, data.preferredUnitTypes ?? []);
    }
}

/**
 * Sensible defaults for the role bank.
 * Seeded on first boot if no role types have been persisted yet.
 */
export const DEFAULT_ROLE_TYPES: Omit<RoleTypeData, "id">[] = [
    // Healthcare
    { title: "Doctor",                   description: "Diagnoses and treats illness and injury.",                                    defaultKinPerMonth: 8_333, preferredUnitTypes: ["primary-care-clinic"] },
    { title: "Nurse",                    description: "Provides direct patient care and health education.",                          defaultKinPerMonth: 5_417, preferredUnitTypes: ["primary-care-clinic"] },
    { title: "Dentist",                  description: "Examines and treats dental and oral health.",                                 defaultKinPerMonth: 7_500, preferredUnitTypes: ["dental-clinic"] },
    { title: "Dental Hygienist",         description: "Performs cleanings, x-rays, and preventive dental care.",                    defaultKinPerMonth: 4_583, preferredUnitTypes: ["dental-clinic"] },
    { title: "EMT / Paramedic",          description: "Provides emergency medical response and pre-hospital care.",                  defaultKinPerMonth: 4_583, preferredUnitTypes: ["fire-station"] },
    { title: "Pharmacist",               description: "Dispenses medications and advises on safe use.",                             defaultKinPerMonth: 6_250, preferredUnitTypes: ["medicine-supply-office"] },
    { title: "Medical Supply Officer",   description: "Procures, stores, and distributes medicines and medical supplies.",          defaultKinPerMonth: 4_167, preferredUnitTypes: ["medicine-supply-office"] },
    { title: "Mental Health Counselor",  description: "Provides counseling and mental health support.",                             defaultKinPerMonth: 5_417, preferredUnitTypes: ["primary-care-clinic"] },
    { title: "Midwife",                  description: "Provides care during pregnancy, labour, and postpartum.",                    defaultKinPerMonth: 5_833, preferredUnitTypes: ["primary-care-clinic"] },
    { title: "Nurse Practitioner",       description: "Advanced practice nurse who diagnoses, prescribes, and manages patient care independently or with physician oversight.", defaultKinPerMonth: 7_083, preferredUnitTypes: ["primary-care-clinic"] },
    { title: "Community Health Worker",  description: "Trained lay health worker who provides health education, triage support, chronic disease monitoring, and connection to care — the front line of community health.", defaultKinPerMonth: 3_333, preferredUnitTypes: ["primary-care-clinic", "community-outreach-team"] },
    { title: "Peer Support Specialist",  description: "Person with lived experience of mental illness or addiction who supports others through recovery and crisis.",           defaultKinPerMonth: 2_917, preferredUnitTypes: ["primary-care-clinic"] },

    // Fire & Emergency
    { title: "Firefighter",              description: "Suppresses fires, performs rescues, and responds to emergencies.",           defaultKinPerMonth: 4_583, preferredUnitTypes: ["fire-station"] },
    { title: "Fire Captain",             description: "Leads a fire crew; coordinates incident response.",                          defaultKinPerMonth: 6_250, preferredUnitTypes: ["fire-station"] },
    { title: "Fire Inspector",           description: "Conducts building inspections and enforces fire codes.",                     defaultKinPerMonth: 5_000, preferredUnitTypes: ["fire-prevention-office"] },

    // Education
    { title: "Teacher",                  description: "Provides instruction and facilitates learning.",                             defaultKinPerMonth: 5_000, preferredUnitTypes: ["primary-school", "secondary-school"] },
    { title: "Early Childhood Educator", description: "Cares for and educates young children.",                                    defaultKinPerMonth: 3_750, preferredUnitTypes: ["childcare-centre"] },
    { title: "Librarian",                description: "Manages knowledge resources and supports community learning.",               defaultKinPerMonth: 3_750, preferredUnitTypes: ["library"] },

    // Food & Agriculture
    { title: "Farmer",                   description: "Cultivates crops and manages agricultural land.",                            defaultKinPerMonth: 3_333, preferredUnitTypes: ["farm-coordination-office"] },
    { title: "Agricultural Worker",      description: "Performs hands-on field and farm labour.",                                  defaultKinPerMonth: 2_500, preferredUnitTypes: ["farm-coordination-office"] },
    { title: "Baker",                    description: "Produces bread and baked goods.",                                           defaultKinPerMonth: 2_917, preferredUnitTypes: ["community-kitchen", "grain-mill"] },
    { title: "Cook",                     description: "Prepares and serves community meals.",                                      defaultKinPerMonth: 2_917, preferredUnitTypes: ["community-kitchen"] },

    // Skilled Trades
    { title: "Carpenter / Builder",      description: "Constructs and repairs buildings and structures.",                          defaultKinPerMonth: 4_167, preferredUnitTypes: [] },
    { title: "Electrician",              description: "Installs and maintains electrical systems.",                                defaultKinPerMonth: 4_583, preferredUnitTypes: ["electricity-office"] },
    { title: "Plumber",                  description: "Installs and repairs water and sanitation systems.",                        defaultKinPerMonth: 4_583, preferredUnitTypes: [] },
    { title: "Mechanic",                 description: "Maintains and repairs vehicles and machinery.",                             defaultKinPerMonth: 4_167, preferredUnitTypes: [] },
    { title: "Solar Technician",         description: "Installs and maintains solar energy systems.",                              defaultKinPerMonth: 4_583, preferredUnitTypes: ["electricity-office"] },

    // Community Care & Services
    { title: "Caregiver",                description: "Provides personal care to people who need daily assistance.",               defaultKinPerMonth: 2_917, preferredUnitTypes: ["community-outreach-team"] },
    { title: "Social Worker",            description: "Supports individuals and families navigating community resources.",         defaultKinPerMonth: 4_167, preferredUnitTypes: ["community-outreach-team"] },
    { title: "Childcare Worker",         description: "Supervises and cares for children in a group setting.",                     defaultKinPerMonth: 2_917, preferredUnitTypes: ["childcare-centre"] },
    { title: "Elder Care Worker",        description: "Provides care and support for elderly community members.",                  defaultKinPerMonth: 2_917, preferredUnitTypes: ["community-outreach-team"] },
    { title: "Sanitation Worker",        description: "Collects waste and maintains sanitary conditions.",                         defaultKinPerMonth: 2_917, preferredUnitTypes: [] },
    { title: "Water Treatment Operator", description: "Operates and monitors drinking water and wastewater systems.",              defaultKinPerMonth: 4_167, preferredUnitTypes: [] },
    { title: "Communications Technician",description: "Installs and maintains communications infrastructure.",                     defaultKinPerMonth: 4_167, preferredUnitTypes: [] },
    { title: "Courier",                  description: "Delivers goods and messages within the community.",                         defaultKinPerMonth: 2_500, preferredUnitTypes: [] },
    { title: "Driver",                   description: "Operates vehicles for transit and logistics.",                              defaultKinPerMonth: 2_917, preferredUnitTypes: [] },

    // Administration & Finance
    { title: "Treasurer / Accountant",   description: "Manages financial records and community accounts.",                        defaultKinPerMonth: 4_583, preferredUnitTypes: ["office", "branch"] },
    { title: "Administrator",            description: "Handles coordination, record-keeping, and organisational tasks.",           defaultKinPerMonth: 3_750, preferredUnitTypes: ["office"] },
];
