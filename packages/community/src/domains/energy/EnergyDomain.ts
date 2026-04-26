import { FunctionalDomain } from "../../common/domain/FunctionalDomain.js";

export const ENERGY_DOMAIN_ID = "ecf-domain-energy-000000010";

/**
 * Energy Domain — coordinates community energy production and distribution.
 *
 * Functional units in this domain (instantiated from templates):
 *   - electricity-office    Manages generation, storage, and grid distribution
 *   - liquid-fuel-office    Manages fuel production, storage, and rationing
 */
export class EnergyDomain extends FunctionalDomain {
    private static instance: EnergyDomain;

    private constructor() {
        super(
            "Energy",
            "Coordinates community energy production, storage, and distribution including electricity and liquid fuels.",
            ENERGY_DOMAIN_ID,
        );
    }

    static getInstance(): EnergyDomain {
        if (!EnergyDomain.instance) EnergyDomain.instance = new EnergyDomain();
        return EnergyDomain.instance;
    }
}
