/**
 * Base class for all commonwealth-level functional domains.
 *
 * Commonwealth domains represent institutional mandates at the
 * inter-federation level. Each domain manages its own entity types directly.
 */
export abstract class CommonwealthFunctionalDomain {
    readonly id: string;
    readonly name: string;
    readonly description: string;

    constructor(name: string, description: string, id: string) {
        this.id          = id;
        this.name        = name;
        this.description = description;
    }
}
