import { FunctionalDomain } from "../../common/domain/FunctionalDomain.js";

export const COMMUNITY_BANK_DOMAIN_ID = "ecf-domain-community-bank-000000004";

/**
 * Community Bank — the functional domain that governs the community's banking
 * service.
 *
 * The bank itself runs as a separate node (`@ecf/bank`). This domain represents
 * the community's governance relationship with that service: who oversees it,
 * what roles exist (Treasurer, Auditor, etc.), and what leader pool holds
 * democratic accountability for it.
 *
 * Monetary operations (account opening, transfers, issuance) happen via
 * BankClient, not through this domain object.
 */
export class CommunityBankDomain extends FunctionalDomain {
    private static instance: CommunityBankDomain;

    private constructor() {
        super(
            "Community Bank",
            "Deposit accounts, transfers, and issuance infrastructure for the community. Governed by an elected treasurer pool.",
            COMMUNITY_BANK_DOMAIN_ID,
        );
    }

    static getInstance(): CommunityBankDomain {
        if (!CommunityBankDomain.instance) {
            CommunityBankDomain.instance = new CommunityBankDomain();
        }
        return CommunityBankDomain.instance;
    }
}
