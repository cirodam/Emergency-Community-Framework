import { randomUUID } from "crypto";

export interface RoleTypeData {
    id: string;
    title: string;
    description: string;
    defaultKinPerMonth: number;
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

    constructor(
        title: string,
        description: string = "",
        defaultKinPerMonth: number = 0,
        id?: string,
    ) {
        this.id = id ?? randomUUID();
        this.title = title;
        this.description = description;
        this.defaultKinPerMonth = defaultKinPerMonth;
    }

    toData(): RoleTypeData {
        return {
            id:                 this.id,
            title:              this.title,
            description:        this.description,
            defaultKinPerMonth: this.defaultKinPerMonth,
        };
    }

    static restore(data: RoleTypeData): RoleType {
        return new RoleType(data.title, data.description, data.defaultKinPerMonth, data.id);
    }
}

/**
 * Sensible defaults for the role bank.
 * Seeded on first boot if no role types have been persisted yet.
 */
export const DEFAULT_ROLE_TYPES: Omit<RoleTypeData, "id">[] = [
    // Healthcare
    { title: "Doctor",                   description: "Diagnoses and treats illness and injury.",                                    defaultKinPerMonth: 0 },
    { title: "Nurse",                    description: "Provides direct patient care and health education.",                          defaultKinPerMonth: 0 },
    { title: "Dentist",                  description: "Examines and treats dental and oral health.",                                 defaultKinPerMonth: 0 },
    { title: "Dental Hygienist",         description: "Performs cleanings, x-rays, and preventive dental care.",                    defaultKinPerMonth: 0 },
    { title: "EMT / Paramedic",          description: "Provides emergency medical response and pre-hospital care.",                  defaultKinPerMonth: 0 },
    { title: "Pharmacist",               description: "Dispenses medications and advises on safe use.",                             defaultKinPerMonth: 0 },
    { title: "Mental Health Counselor",  description: "Provides counseling and mental health support.",                             defaultKinPerMonth: 0 },
    { title: "Midwife",                  description: "Provides care during pregnancy, labour, and postpartum.",                    defaultKinPerMonth: 0 },

    // Fire & Emergency
    { title: "Firefighter",              description: "Suppresses fires, performs rescues, and responds to emergencies.",           defaultKinPerMonth: 0 },
    { title: "Fire Captain",             description: "Leads a fire crew; coordinates incident response.",                          defaultKinPerMonth: 0 },
    { title: "Fire Inspector",           description: "Conducts building inspections and enforces fire codes.",                     defaultKinPerMonth: 0 },

    // Education
    { title: "Teacher",                  description: "Provides instruction and facilitates learning.",                             defaultKinPerMonth: 0 },
    { title: "Early Childhood Educator", description: "Cares for and educates young children.",                                    defaultKinPerMonth: 0 },
    { title: "Librarian",                description: "Manages knowledge resources and supports community learning.",               defaultKinPerMonth: 0 },

    // Food & Agriculture
    { title: "Farmer",                   description: "Cultivates crops and manages agricultural land.",                            defaultKinPerMonth: 0 },
    { title: "Agricultural Worker",      description: "Performs hands-on field and farm labour.",                                  defaultKinPerMonth: 0 },
    { title: "Baker",                    description: "Produces bread and baked goods.",                                           defaultKinPerMonth: 0 },
    { title: "Cook",                     description: "Prepares and serves community meals.",                                      defaultKinPerMonth: 0 },

    // Skilled Trades
    { title: "Carpenter / Builder",      description: "Constructs and repairs buildings and structures.",                          defaultKinPerMonth: 0 },
    { title: "Electrician",              description: "Installs and maintains electrical systems.",                                defaultKinPerMonth: 0 },
    { title: "Plumber",                  description: "Installs and repairs water and sanitation systems.",                        defaultKinPerMonth: 0 },
    { title: "Mechanic",                 description: "Maintains and repairs vehicles and machinery.",                             defaultKinPerMonth: 0 },
    { title: "Solar Technician",         description: "Installs and maintains solar energy systems.",                              defaultKinPerMonth: 0 },

    // Community Care & Services
    { title: "Caregiver",                description: "Provides personal care to people who need daily assistance.",               defaultKinPerMonth: 0 },
    { title: "Social Worker",            description: "Supports individuals and families navigating community resources.",         defaultKinPerMonth: 0 },
    { title: "Childcare Worker",         description: "Supervises and cares for children in a group setting.",                     defaultKinPerMonth: 0 },
    { title: "Elder Care Worker",        description: "Provides care and support for elderly community members.",                  defaultKinPerMonth: 0 },
    { title: "Sanitation Worker",        description: "Collects waste and maintains sanitary conditions.",                         defaultKinPerMonth: 0 },
    { title: "Water Treatment Operator", description: "Operates and monitors drinking water and wastewater systems.",              defaultKinPerMonth: 0 },
    { title: "Communications Technician",description: "Installs and maintains communications infrastructure.",                     defaultKinPerMonth: 0 },
    { title: "Courier",                  description: "Delivers goods and messages within the community.",                         defaultKinPerMonth: 0 },
    { title: "Driver",                   description: "Operates vehicles for transit and logistics.",                              defaultKinPerMonth: 0 },

    // Administration & Finance
    { title: "Treasurer / Accountant",   description: "Manages financial records and community accounts.",                        defaultKinPerMonth: 0 },
    { title: "Administrator",            description: "Handles coordination, record-keeping, and organisational tasks.",           defaultKinPerMonth: 0 },
];
