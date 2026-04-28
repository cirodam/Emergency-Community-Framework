/**
 * Base class for all globe-level functional domains.
 *
 * Globe domains represent institutional mandates at the
 * inter-commonwealth level. Each domain manages its own entity types directly.
 */
export abstract class GlobeFunctionalDomain {
    readonly id: string;
    readonly name: string;
    readonly description: string;

    constructor(name: string, description: string, id: string) {
        this.id          = id;
        this.name        = name;
        this.description = description;
    }
}
