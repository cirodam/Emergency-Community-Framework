/**
 * Base class for all federation-level functional domains.
 *
 * Federation domains represent institutional mandates at the inter-community
 * level (e.g. Insurance, Reinsurance, Standards). Unlike community domains,
 * federation domains manage specific institutional entities directly rather
 * than template-instantiated units.
 */
export abstract class FederationFunctionalDomain {
    readonly id: string;
    readonly name: string;
    readonly description: string;

    constructor(name: string, description: string, id: string) {
        this.id          = id;
        this.name        = name;
        this.description = description;
    }
}
