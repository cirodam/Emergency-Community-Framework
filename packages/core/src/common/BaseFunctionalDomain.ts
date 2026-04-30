import { randomUUID } from "crypto";

/**
 * Shared base for all functional domains across every layer
 * (community, federation, commonwealth, globe).
 *
 * A domain represents an institutional mandate. Only `id`, `name`, and
 * `description` are common to every layer; layer-specific fields (unitIds,
 * budgetItems, poolId, …) live in the concrete subclass.
 */
export abstract class BaseFunctionalDomain {
    readonly id:          string;
    readonly name:        string;
    readonly description: string;

    constructor(name: string, description: string, id?: string) {
        this.id          = id ?? randomUUID();
        this.name        = name;
        this.description = description;
    }
}
