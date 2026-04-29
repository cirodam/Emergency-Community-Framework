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
    { title: "Doctor",                   description: "Diagnoses and treats illness and injury.",                                    defaultKinPerMonth: 8_333 },  // 100k/yr
    { title: "Nurse",                    description: "Provides direct patient care and health education.",                          defaultKinPerMonth: 5_417 },  //  65k/yr
    { title: "Dentist",                  description: "Examines and treats dental and oral health.",                                 defaultKinPerMonth: 7_500 },  //  90k/yr
    { title: "Dental Hygienist",         description: "Performs cleanings, x-rays, and preventive dental care.",                    defaultKinPerMonth: 4_583 },  //  55k/yr
    { title: "EMT / Paramedic",          description: "Provides emergency medical response and pre-hospital care.",                  defaultKinPerMonth: 4_583 },  //  55k/yr
    { title: "Pharmacist",               description: "Dispenses medications and advises on safe use.",                             defaultKinPerMonth: 6_250 },  //  75k/yr
    { title: "Medical Supply Officer",   description: "Procures, stores, and distributes medicines and medical supplies.",          defaultKinPerMonth: 4_167 },  //  50k/yr
    { title: "Mental Health Counselor",  description: "Provides counseling and mental health support.",                             defaultKinPerMonth: 5_417 },  //  65k/yr
    { title: "Midwife",                  description: "Provides care during pregnancy, labour, and postpartum.",                    defaultKinPerMonth: 5_833 },  //  70k/yr

    // Fire & Emergency
    { title: "Firefighter",              description: "Suppresses fires, performs rescues, and responds to emergencies.",           defaultKinPerMonth: 4_583 },  //  55k/yr
    { title: "Fire Captain",             description: "Leads a fire crew; coordinates incident response.",                          defaultKinPerMonth: 6_250 },  //  75k/yr
    { title: "Fire Inspector",           description: "Conducts building inspections and enforces fire codes.",                     defaultKinPerMonth: 5_000 },  //  60k/yr

    // Education
    { title: "Teacher",                  description: "Provides instruction and facilitates learning.",                             defaultKinPerMonth: 5_000 },  //  60k/yr
    { title: "Early Childhood Educator", description: "Cares for and educates young children.",                                    defaultKinPerMonth: 3_750 },  //  45k/yr
    { title: "Librarian",                description: "Manages knowledge resources and supports community learning.",               defaultKinPerMonth: 3_750 },  //  45k/yr

    // Food & Agriculture
    { title: "Farmer",                   description: "Cultivates crops and manages agricultural land.",                            defaultKinPerMonth: 3_333 },  //  40k/yr
    { title: "Agricultural Worker",      description: "Performs hands-on field and farm labour.",                                  defaultKinPerMonth: 2_500 },  //  30k/yr
    { title: "Baker",                    description: "Produces bread and baked goods.",                                           defaultKinPerMonth: 2_917 },  //  35k/yr
    { title: "Cook",                     description: "Prepares and serves community meals.",                                      defaultKinPerMonth: 2_917 },  //  35k/yr

    // Skilled Trades
    { title: "Carpenter / Builder",      description: "Constructs and repairs buildings and structures.",                          defaultKinPerMonth: 4_167 },  //  50k/yr
    { title: "Electrician",              description: "Installs and maintains electrical systems.",                                defaultKinPerMonth: 4_583 },  //  55k/yr
    { title: "Plumber",                  description: "Installs and repairs water and sanitation systems.",                        defaultKinPerMonth: 4_583 },  //  55k/yr
    { title: "Mechanic",                 description: "Maintains and repairs vehicles and machinery.",                             defaultKinPerMonth: 4_167 },  //  50k/yr
    { title: "Solar Technician",         description: "Installs and maintains solar energy systems.",                              defaultKinPerMonth: 4_583 },  //  55k/yr

    // Community Care & Services
    { title: "Caregiver",                description: "Provides personal care to people who need daily assistance.",               defaultKinPerMonth: 2_917 },  //  35k/yr
    { title: "Social Worker",            description: "Supports individuals and families navigating community resources.",         defaultKinPerMonth: 4_167 },  //  50k/yr
    { title: "Childcare Worker",         description: "Supervises and cares for children in a group setting.",                     defaultKinPerMonth: 2_917 },  //  35k/yr
    { title: "Elder Care Worker",        description: "Provides care and support for elderly community members.",                  defaultKinPerMonth: 2_917 },  //  35k/yr
    { title: "Sanitation Worker",        description: "Collects waste and maintains sanitary conditions.",                         defaultKinPerMonth: 2_917 },  //  35k/yr
    { title: "Water Treatment Operator", description: "Operates and monitors drinking water and wastewater systems.",              defaultKinPerMonth: 4_167 },  //  50k/yr
    { title: "Communications Technician",description: "Installs and maintains communications infrastructure.",                     defaultKinPerMonth: 4_167 },  //  50k/yr
    { title: "Courier",                  description: "Delivers goods and messages within the community.",                         defaultKinPerMonth: 2_500 },  //  30k/yr
    { title: "Driver",                   description: "Operates vehicles for transit and logistics.",                              defaultKinPerMonth: 2_917 },  //  35k/yr

    // Administration & Finance
    { title: "Treasurer / Accountant",   description: "Manages financial records and community accounts.",                        defaultKinPerMonth: 4_583 },  //  55k/yr
    { title: "Administrator",            description: "Handles coordination, record-keeping, and organisational tasks.",           defaultKinPerMonth: 3_750 },  //  45k/yr
];
