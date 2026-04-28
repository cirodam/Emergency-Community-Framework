import { FederationFunctionalDomain } from "../../common/FederationFunctionalDomain.js";

export const FEDERATION_HEALTHCARE_DOMAIN_ID = "ecf-federation-domain-healthcare-000001";

/**
 * Healthcare Domain — the federation's health insurance function.
 *
 * At the federation level, the healthcare domain provides:
 *   - Federal health insurance for major illness, surgery, and catastrophic
 *     events that exceed community-level capacity
 *   - Reinsurance backstop for community health systems when local pools
 *     are depleted
 *   - Standards and protocols for inter-community patient referrals and care
 *   - Pooled procurement of medicines and medical equipment across member
 *     communities
 *
 * Community-level healthcare domains handle primary and preventive care locally.
 * This domain handles what individual communities cannot handle alone.
 */
export class HealthcareDomain extends FederationFunctionalDomain {
    private static instance: HealthcareDomain;

    private constructor() {
        super(
            "Healthcare",
            "Provides federal health insurance, reinsurance backstop for community health systems, and pooled medical procurement across the federation.",
            FEDERATION_HEALTHCARE_DOMAIN_ID,
        );
    }

    static getInstance(): HealthcareDomain {
        if (!HealthcareDomain.instance) HealthcareDomain.instance = new HealthcareDomain();
        return HealthcareDomain.instance;
    }
}
