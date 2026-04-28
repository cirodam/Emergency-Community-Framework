import express from "express";
import { fileURLToPath } from "url";
import { dirname, join, resolve } from "path";
import { NodeService, NodeSigner, ClusterService, DataManifest, networkRouter, messageRouter, parseRoutableAddress, MessageDispatcher } from "@ecf/core";
import { PaymentTokenService } from "./PaymentTokenService.js";
import { clusterRoutes } from "./routes/clusterRoutes.js";
import { PersonLoader } from "./person/PersonLoader.js";
import { PersonService } from "./person/PersonService.js";
import { Person } from "./person/Person.js";
import { MemberApplicationLoader } from "./applications/MemberApplicationLoader.js";
import { MemberApplicationService } from "./applications/MemberApplicationService.js";
import { pushCensus } from "./census/CensusService.js";
import { AssociationLoader } from "./association/AssociationLoader.js";
import { AssociationService } from "./association/AssociationService.js";
import { OrgLoader } from "./organization/OrgLoader.js";
import { OrgService } from "./organization/OrgService.js";
import { CalendarEventLoader } from "./calendar/CalendarEventLoader.js";
import { CalendarService } from "./calendar/CalendarService.js";
import { LocationLoader } from "./location/LocationLoader.js";
import { LocationService } from "./location/LocationService.js";
import { RoleTypeLoader } from "./common/RoleTypeLoader.js";
import { RoleType, DEFAULT_ROLE_TYPES } from "./common/RoleType.js";
import { CommunityRoleLoader } from "./common/domain/CommunityRoleLoader.js";
import { FunctionalUnit } from "./common/domain/FunctionalUnit.js";
import { FunctionalUnitLoader } from "./common/domain/FunctionalUnitLoader.js";
import { FunctionalDomainLoader } from "./common/domain/FunctionalDomainLoader.js";
import { LeaderPoolLoader } from "./governance/LeaderPoolLoader.js";
import { Constitution } from "./governance/Constitution.js";
import { ConstitutionLoader } from "./governance/ConstitutionLoader.js";
import { ProposalLoader } from "./governance/ProposalLoader.js";
import { ProposalService } from "./governance/ProposalService.js";
import { DomainService } from "./DomainService.js";
import { BankClient } from "@ecf/core";
import { CentralBank } from "./domains/central_bank/CentralBank.js";
import { CentralBankLoader } from "./domains/central_bank/CentralBankLoader.js";
import { SocialInsuranceBank } from "./domains/social_insurance/SocialInsuranceBank.js";
import { SocialInsuranceBankLoader } from "./domains/social_insurance/SocialInsuranceBankLoader.js";
import { SocialInsuranceMemberLoader } from "./domains/social_insurance/SocialInsuranceMemberLoader.js";
import communityRoutes from "./routes/communityRoutes.js";
import { handleInboundMail } from "./routes/MailRelayController.js";
import { handleBankTransferReceive } from "./routes/TransferController.js";
import { CommunityBankDomain } from "./domains/community_bank/CommunityBankDomain.js";
import { CommunityTreasury } from "./domains/community_treasury/CommunityTreasury.js";
import { CommunityTreasuryLoader } from "./domains/community_treasury/CommunityTreasuryLoader.js";
import { FederationMembershipService } from "./FederationMembershipService.js";
import { GsmModemProvider } from "./sms/GsmModemProvider.js";
import { SmsService } from "./sms/SmsService.js";
import { FoodDomain } from "./domains/food/FoodDomain.js";
import { FoodUnitTemplates } from "./domains/food/FoodUnitTemplates.js";
import { AgricultureDomain } from "./domains/agriculture/AgricultureDomain.js";
import { AgricultureUnitTemplates } from "./domains/agriculture/AgricultureUnitTemplates.js";
import { HealthcareDomain } from "./domains/healthcare/HealthcareDomain.js";
import { HealthcareUnitTemplates } from "./domains/healthcare/HealthcareUnitTemplates.js";
import { HousingDomain } from "./domains/housing/HousingDomain.js";
import { HousingUnitTemplates } from "./domains/housing/HousingUnitTemplates.js";
import { EnergyDomain } from "./domains/energy/EnergyDomain.js";
import { EnergyUnitTemplates } from "./domains/energy/EnergyUnitTemplates.js";
import { CommunicationsDomain } from "./domains/communications/CommunicationsDomain.js";
import { CommunicationsUnitTemplates } from "./domains/communications/CommunicationsUnitTemplates.js";
import { DeathcareDomain } from "./domains/deathcare/DeathcareDomain.js";
import { DeathcareUnitTemplates } from "./domains/deathcare/DeathcareUnitTemplates.js";
import { SanitationDomain } from "./domains/sanitation/SanitationDomain.js";
import { SanitationUnitTemplates } from "./domains/sanitation/SanitationUnitTemplates.js";
import { WaterDomain } from "./domains/water/WaterDomain.js";
import { WaterUnitTemplates } from "./domains/water/WaterUnitTemplates.js";
import { FireDomain } from "./domains/fire/FireDomain.js";
import { FireUnitTemplates } from "./domains/fire/FireUnitTemplates.js";
import { ChildcareDomain } from "./domains/childcare/ChildcareDomain.js";
import { ChildcareUnitTemplates } from "./domains/childcare/ChildcareUnitTemplates.js";
import { DependencyCareDomain } from "./domains/dependency_care/DependencyCareDomain.js";
import { DependencyCareUnitTemplates } from "./domains/dependency_care/DependencyCareUnitTemplates.js";
import { EducationDomain } from "./domains/education/EducationDomain.js";
import { EducationUnitTemplates } from "./domains/education/EducationUnitTemplates.js";
import { EnrichmentDomain } from "./domains/enrichment/EnrichmentDomain.js";
import { EnrichmentUnitTemplates } from "./domains/enrichment/EnrichmentUnitTemplates.js";
import { TransitDomain } from "./domains/transit/TransitDomain.js";
import { TransitUnitTemplates } from "./domains/transit/TransitUnitTemplates.js";
import { CourierDomain } from "./domains/courier/CourierDomain.js";
import { CourierUnitTemplates } from "./domains/courier/CourierUnitTemplates.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const PORT             = Number(process.env.PORT              ?? 3002);
const DATA_DIR         = process.env.DATA_DIR         ?? join(__dirname, "../../data");
const BANK_URL         = process.env.BANK_URL          ?? "http://localhost:3001";
const CLUSTER_PEERS    = (process.env.CLUSTER_PEERS    ?? "").split(",").filter(Boolean);
const CLUSTER_PRIORITY = Number(process.env.CLUSTER_PRIORITY ?? 100);

const app = express();

app.use(express.json({
    verify: (req, _res, buf) => {
        (req as typeof req & { rawBody: string }).rawBody = buf.toString("utf-8");
    },
}));

async function main(): Promise<void> {
    // ── Node identity ──────────────────────────────────────────────────────
    await NodeService.getInstance().init({
        type:     "community",
        name:     process.env.NODE_NAME     ?? "community",
        address:  process.env.NODE_ADDRESS  ?? `http://localhost:${PORT}`,
        entityId: process.env.NODE_ENTITY_ID,
        dataDir:  resolve(DATA_DIR, "network"),
        seeds:    (process.env.BOOTSTRAP_PEERS ?? "").split(",").filter(Boolean),
    });

    // ── Community signer ──────────────────────────────────────────────────
    // In a multi-node cluster every replica must share the same community
    // key pair so that PersonCredentials and bank-auth requests are valid
    // regardless of which node issued them.
    //
    // Single-node mode: omit COMMUNITY_PRIVATE_KEY → falls back to the
    // per-node key generated by NodeService on first boot.
    //
    // Cluster mode: generate once with NodeSigner.generate(), distribute the
    // privateKeyDer hex to all replicas via COMMUNITY_PRIVATE_KEY.
    const communityPrivateKeyHex = process.env.COMMUNITY_PRIVATE_KEY;
    const communitySigner: NodeSigner = communityPrivateKeyHex
        ? NodeSigner.fromPrivateKeyHex(communityPrivateKeyHex)
        : NodeService.getInstance().getSigner();

    if (communityPrivateKeyHex) {
        console.log(`[community] using shared community key (cluster mode) — pubkey: ${communitySigner.publicKeyHex.slice(0, 16)}…`);
    } else if (CLUSTER_PEERS.length > 0) {
        console.warn(
            "[community] CLUSTER_PEERS is set but COMMUNITY_PRIVATE_KEY is not. " +
            "Each node will use its own key — credentials issued by one node will " +
            "NOT be accepted by others. Generate a shared key with:\n" +
            "  node -e \"const {generateKeyPairSync}=require('crypto');" +
            "const {privateKey}=generateKeyPairSync('ed25519');" +
            "console.log(privateKey.export({type:'pkcs8',format:'der'}).toString('hex'))\"\n" +
            "Then set COMMUNITY_PRIVATE_KEY on all cluster nodes."
        );
    }

    // ── Cluster coordination ───────────────────────────────────────────────
    const cluster = ClusterService.getInstance();
    await cluster.init({
        myUrl:    process.env.NODE_ADDRESS ?? `http://localhost:${PORT}`,
        priority: CLUSTER_PRIORITY,
        peers:    CLUSTER_PEERS,
        signer:   communitySigner,
        dataDir:  DATA_DIR,
    });

    // Cold-start: if we're a replica, pull the primary's state before
    // loading any services from disk. This ensures the replica starts
    // with a consistent copy of the community data.
    if (!cluster.isPrimary()) {
        console.log("[cluster] starting as replica — pulling state from primary...");
        await cluster.syncFromPrimary();
        console.log("[cluster] cold-start sync complete — booting services");
    }

    // ── Federation membership (community node owns the application process) ─
    FederationMembershipService.getInstance(DATA_DIR);

    DataManifest.getInstance().init(
        body => communitySigner.signBody(body),
        communitySigner.publicKeyHex,
    );

    // ── Constitution ───────────────────────────────────────────────────────
    const constitutionLoader = new ConstitutionLoader(resolve(DATA_DIR, "governance"));
    constitutionLoader.load();

    // ── Persons ────────────────────────────────────────────────────────────
    const personLoader = new PersonLoader(resolve(DATA_DIR, "persons"));
    PersonService.getInstance().init(personLoader);
    PersonService.getInstance().setCommunitySigner(communitySigner);

    // ── Member applications ────────────────────────────────────────────────
    const appLoader = new MemberApplicationLoader(resolve(DATA_DIR, "applications"));
    MemberApplicationService.getInstance().init(appLoader);

    // ── Associations ───────────────────────────────────────────────────────
    const associationLoader = new AssociationLoader(resolve(DATA_DIR, "associations"));
    AssociationService.getInstance().init(associationLoader);

    // ── Organizations ──────────────────────────────────────────────────────
    const orgLoader = new OrgLoader(resolve(DATA_DIR, "orgs"));
    OrgService.getInstance().init(orgLoader);

    // ── Calendar ─────────────────────────────────────────────────────────────
    const calendarLoader = new CalendarEventLoader(resolve(DATA_DIR, "calendar"));
    CalendarService.getInstance().init(calendarLoader);

    // ── Locations ─────────────────────────────────────────────────────────────
    const locationLoader = new LocationLoader(resolve(DATA_DIR, "locations"));
    LocationService.getInstance().init(locationLoader);

    // ── Governance proposals ───────────────────────────────────────────────
    const proposalLoader = new ProposalLoader(resolve(DATA_DIR, "proposals"));
    ProposalService.getInstance().init(proposalLoader, constitutionLoader);

    // ── Payment tokens ─────────────────────────────────────────────────────
    // Auto-assemble RoutableAddress from federation membership record when approved,
    // fall back to ROUTABLE_ADDRESS env var for dev/bootstrap.
    const membership = FederationMembershipService.getInstance().getStatus();
    let routableAddress: import("@ecf/core").RoutableAddress;
    if (
        membership?.status === "approved" &&
        membership.communityHandle &&
        membership.federationHandle &&
        membership.commonwealthHandle
    ) {
        routableAddress = {
            commonwealth: membership.commonwealthHandle,
            federation:   membership.federationHandle,
            community:    membership.communityHandle,
        };
    } else {
        const raw = process.env.ROUTABLE_ADDRESS ?? "globe:local-federation:local-community";
        routableAddress = parseRoutableAddress(raw);
    }
    PaymentTokenService.getInstance().init(resolve(DATA_DIR, "payment-tokens"), routableAddress);

    // When an application collects enough vouches, admit the applicant as a full Person.
    MemberApplicationService.getInstance().onAdmitted(async (app) => {
        const person = new Person(
            app.firstName,
            app.lastName,
            new Date(app.birthDate),
        );
        await PersonService.getInstance().add(person);
        console.log(`[community] admitted ${app.firstName} ${app.lastName} via application ${app.id}`);

        // Push updated census to federation (no-op if not a federation member).
        pushCensus().then(result => {
            if (result?.duplicates.length) {
                console.warn(`[census] duplicate nullifiers detected across communities: ${result.duplicates.join(", ")}`);
            }
        }).catch(err => {
            console.warn(`[census] failed to push census after admission: ${(err as Error).message}`);
        });
    });

    // ── Domain registries ──────────────────────────────────────────────────
    const domainSvc = DomainService.getInstance();
    domainSvc.init(
        new FunctionalDomainLoader(resolve(DATA_DIR, "domains")),
        new FunctionalUnitLoader(resolve(DATA_DIR, "units")),
        new CommunityRoleLoader(resolve(DATA_DIR, "roles")),
        new LeaderPoolLoader(resolve(DATA_DIR, "pools")),
    );

    // ── Role type bank ─────────────────────────────────────────────────────
    const roleTypeLoader = new RoleTypeLoader(resolve(DATA_DIR, "role-types"));
    domainSvc.initRoleTypes(roleTypeLoader);

    // Seed defaults on first boot (once any custom types exist we leave them alone)
    if (domainSvc.getRoleTypes().length === 0) {
        for (const def of DEFAULT_ROLE_TYPES) {
            domainSvc.createRoleType(new RoleType(def.title, def.description, def.defaultKinPerMonth));
        }
        console.log(`[community] seeded ${DEFAULT_ROLE_TYPES.length} default role types`);
    }

    // Register the four monetary/financial domains so they participate in
    // governance — they get leader pools, roles, and appear in the domain API.
    // Monetary init (async bank connection) happens separately below.
    domainSvc.registerDomain(CentralBank.getInstance());
    if (CentralBank.getInstance().unitIds.length === 0) {
        domainSvc.createUnit(
            new FunctionalUnit("Central Bank Office", "The central administrative office of the central bank.", "office"),
            CentralBank.getInstance().id,
        );
    }

    domainSvc.registerDomain(SocialInsuranceBank.getInstance());
    if (SocialInsuranceBank.getInstance().unitIds.length === 0) {
        domainSvc.createUnit(
            new FunctionalUnit("Social Insurance Office", "The central administrative office of the social insurance bank.", "office"),
            SocialInsuranceBank.getInstance().id,
        );
    }

    domainSvc.registerDomain(CommunityTreasury.getInstance());

    domainSvc.registerDomain(CommunityBankDomain.getInstance());
    if (CommunityBankDomain.getInstance().unitIds.length === 0) {
        domainSvc.createUnit(
            new FunctionalUnit("Main Branch", "The primary branch of the community bank.", "branch"),
            CommunityBankDomain.getInstance().id,
        );
    }
    domainSvc.registerDomain(FoodDomain.getInstance());
    if (FoodDomain.getInstance().unitIds.length === 0) {
        domainSvc.createUnit(
            new FunctionalUnit("Food Supply Office", "Central office coordinating food procurement, storage, and distribution for the community.", "food-supply-office"),
            FoodDomain.getInstance().id,
        );
        domainSvc.createUnit(
            new FunctionalUnit("Community Kitchen", "Shared kitchen space for food preparation and cooking. Handles raw ingredient processing, meal preparation, and food preservation for the community.", "community-kitchen"),
            FoodDomain.getInstance().id,
        );
    }
    domainSvc.registerDomain(AgricultureDomain.getInstance());
    if (AgricultureDomain.getInstance().unitIds.length === 0) {
        domainSvc.createUnit(
            new FunctionalUnit("Farm Coordination Office", "Coordinates land allocation, planting schedules, shared equipment, and harvest logistics across community farms and individual growers.", "farm-coordination-office"),
            AgricultureDomain.getInstance().id,
        );
    }
    domainSvc.registerDomain(HealthcareDomain.getInstance());
    if (HealthcareDomain.getInstance().unitIds.length === 0) {
        domainSvc.createUnit(
            new FunctionalUnit("Medicine Supply Office", "Manages procurement, storage, and distribution of medicines and medical supplies for the community.", "medicine-supply-office"),
            HealthcareDomain.getInstance().id,
        );
        domainSvc.createUnit(
            new FunctionalUnit("Primary Care Clinic", "General medical care, preventive health, chronic disease management, and triage for the community.", "primary-care-clinic"),
            HealthcareDomain.getInstance().id,
        );
    }
    domainSvc.registerDomain(HousingDomain.getInstance());
    domainSvc.registerDomain(EnergyDomain.getInstance());
    if (EnergyDomain.getInstance().unitIds.length === 0) {
        domainSvc.createUnit(
            new FunctionalUnit("Liquid Fuels Office", "Manages production or procurement, storage, and rationing of liquid fuels including biodiesel and petrol.", "liquid-fuel-office"),
            EnergyDomain.getInstance().id,
        );
    }
    domainSvc.registerDomain(CommunicationsDomain.getInstance());
    domainSvc.registerDomain(DeathcareDomain.getInstance());
    domainSvc.registerDomain(SanitationDomain.getInstance());
    domainSvc.registerDomain(WaterDomain.getInstance());
    domainSvc.registerDomain(FireDomain.getInstance());
    domainSvc.registerDomain(ChildcareDomain.getInstance());
    domainSvc.registerDomain(DependencyCareDomain.getInstance());
    if (DependencyCareDomain.getInstance().unitIds.length === 0) {
        domainSvc.createUnit(
            new FunctionalUnit("Community Outreach Team", "Identifies at-risk, isolated, or vulnerable community members — including elderly, disabled, and food-insecure individuals — and coordinates delivery of food, medicine, and care services to them.", "community-outreach-team"),
            DependencyCareDomain.getInstance().id,
        );
    }
    domainSvc.registerDomain(EducationDomain.getInstance());
    domainSvc.registerDomain(EnrichmentDomain.getInstance());
    domainSvc.registerDomain(TransitDomain.getInstance());
    domainSvc.registerDomain(CourierDomain.getInstance());

    // Register all unit templates so POST /api/units can instantiate them by type.
    FoodUnitTemplates.register();
    AgricultureUnitTemplates.register();
    HealthcareUnitTemplates.register();
    HousingUnitTemplates.register();
    EnergyUnitTemplates.register();
    CommunicationsUnitTemplates.register();
    DeathcareUnitTemplates.register();
    SanitationUnitTemplates.register();
    WaterUnitTemplates.register();
    FireUnitTemplates.register();
    ChildcareUnitTemplates.register();
    DependencyCareUnitTemplates.register();
    EducationUnitTemplates.register();
    EnrichmentUnitTemplates.register();
    TransitUnitTemplates.register();
    CourierUnitTemplates.register();

    // ── Monetary institutions (non-fatal — bank may be unreachable) ────────
    const bank = new BankClient(BANK_URL, body => communitySigner.signBody(body));

    // On join: open a primary kin account and issue the age-derived endowment.
    // Non-fatal: if the bank is temporarily unreachable the person record still
    // commits — the monetary operations are best-effort at join time.
    PersonService.getInstance().onPersonJoined(async (person) => {
        const displayName  = `${person.firstName} ${person.lastName}`;
        const centralBank  = CentralBank.getInstance();
        const siBank       = SocialInsuranceBank.getInstance();
        const treasury     = CommunityTreasury.getInstance();
        const constitution = Constitution.getInstance();

        try {
            const memberAccount = await bank.openAccount(person.id, displayName, "kin");
            console.log(`[community] opened bank account for @${person.handle}`);

            if (!centralBank.isReady() || !siBank.isReady() || !treasury.isReady()) {
                console.warn(`[community] monetary institutions not ready — skipping issuance for @${person.handle}`);
                return;
            }

            if (person.bornInCommunity) {
                // ── Born into the community ───────────────────────────────────
                // No back-endowment — this person has no prior years to credit.
                // Issue a fixed birth grant into the community fund, which
                // forwards it directly to the member. Their kin accrual begins
                // on their first birthday via the anniversary handler.
                const grantAmount = constitution.birthGrant;
                if (grantAmount > 0) {
                    await centralBank.issue(grantAmount, treasury.accountId,       "birth grant — community fund");
                    await treasury.transfer(memberAccount.accountId, grantAmount,  "birth grant — to member");
                    console.log(`[community] issued birth grant for @${person.handle}: ${grantAmount} kin`);
                } else {
                    console.log(`[community] birth grant is 0 — no issuance for @${person.handle}`);
                }
            } else {
                // ── Joining from outside ──────────────────────────────────────
                // Age-derived back-endowment: floor(age in years) × kinPerPersonYear.
                // All kin is issued into the community fund first; the fund then
                // distributes per policy: pool fraction → insurance fund,
                // seed balance → member, remainder stays in the community fund.
                const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;
                const ageInYears  = Math.floor((Date.now() - person.birthDate.getTime()) / MS_PER_YEAR);
                const endowment   = ageInYears * constitution.kinPerPersonYear;

                if (endowment <= 0) {
                    console.log(`[community] zero endowment for @${person.handle} (age ${ageInYears}) — skipping issuance`);
                    return;
                }

                const poolAmount     = Math.floor(endowment * constitution.endowmentPoolFraction);
                const circulating    = endowment - poolAmount;
                const seedAmount     = Math.min(constitution.endowmentSeedBalance, circulating);
                const treasuryAmount = circulating - seedAmount;

                await centralBank.issue(endowment, treasury.accountId,              "join endowment — community fund");
                await treasury.transfer(siBank.poolAccountId,    poolAmount,        "join endowment — insurance fund");
                await treasury.transfer(memberAccount.accountId, seedAmount,        "join endowment — member seed balance");
                // treasuryAmount remains in the community fund

                siBank.recordContribution(person.id, poolAmount);

                console.log(
                    `[community] issued join endowment for @${person.handle}: ` +
                    `${endowment} kin (community fund: ${treasuryAmount}, insurance: ${poolAmount}, member seed: ${seedAmount})`,
                );
            }
        } catch (err) {
            console.warn(`[community] join handler failed for @${person.handle}: ${(err as Error).message}`);
        }
    });

    // On discharge (departure or death): retire the person's endowment from
    // circulation. Target retirement = floor(age in years) × kinPerPersonYear.
    // The person's entire balance is transferred to the central bank and retired.
    // If balance >= target: the surplus goes to the community treasury.
    // If balance < target: the shortfall is recorded and gradually recouped via
    // the regular demurrage cycle.
    PersonService.getInstance().onPersonDischarged(async (person) => {
        const centralBank  = CentralBank.getInstance();
        const treasury     = CommunityTreasury.getInstance();
        const constitution = Constitution.getInstance();

        if (!centralBank.isReady() || !treasury.isReady()) {
            console.warn(`[community] monetary institutions not ready — skipping discharge settlement for @${person.handle}`);
            return;
        }

        try {
            const memberAccount = await bank.getPrimaryAccountAsync(person.id);
            if (!memberAccount) {
                console.warn(`[community] no bank account found for @${person.handle} — skipping discharge settlement`);
                return;
            }

            const MS_PER_YEAR   = 365.25 * 24 * 60 * 60 * 1000;
            const ageInYears    = Math.floor((Date.now() - person.birthDate.getTime()) / MS_PER_YEAR);
            const targetRetire  = ageInYears * constitution.kinPerPersonYear;
            const balance       = memberAccount.amount;

            if (balance > 0) {
                // Retire the full balance from circulation
                await centralBank.retire(balance, memberAccount.accountId,
                    `discharge settlement — @${person.handle}`);
            }

            if (balance >= targetRetire) {
                // Surplus above the endowment target goes to the community treasury
                const surplus = balance - targetRetire;
                if (surplus > 0) {
                    await centralBank.issue(surplus, treasury.accountId,
                        `discharge surplus — @${person.handle}`);
                    console.log(`[community] discharge @${person.handle}: retired ${targetRetire}, surplus ${surplus} kin → treasury`);
                } else {
                    console.log(`[community] discharge @${person.handle}: retired ${balance} kin (exact)`);
                }
            } else {
                // Shortfall — record it for gradual demurrage recovery
                const shortfall = targetRetire - balance;
                centralBank.recordDischargeShortfall(shortfall);
                console.log(`[community] discharge @${person.handle}: retired ${balance} kin, shortfall ${shortfall} kin recorded`);
            }

            // All balances are now zero — close the accounts
            await bank.closeAccounts(person.id);
            console.log(`[community] closed bank accounts for @${person.handle}`);
        } catch (err) {
            console.warn(`[community] discharge handler failed for @${person.handle}: ${(err as Error).message}`);
        }
    });

    const centralBankLoader   = new CentralBankLoader(DATA_DIR);
    const siBankLoader        = new SocialInsuranceBankLoader(DATA_DIR);
    const siMemberLoader      = new SocialInsuranceMemberLoader(resolve(DATA_DIR, "si_members"));
    const treasuryLoader      = new CommunityTreasuryLoader(DATA_DIR);

    async function initMonetaryInstitutions(): Promise<void> {
        await CentralBank.getInstance().init(bank, centralBankLoader);
        await SocialInsuranceBank.getInstance().init(bank, siBankLoader, siMemberLoader);
        await CommunityTreasury.getInstance().init(bank, treasuryLoader);
        console.log("[community] monetary institutions ready");
    }

    async function tryInitMonetary(attempt = 1): Promise<void> {
        try {
            await initMonetaryInstitutions();
        } catch (err) {
            const delay = Math.min(30_000, attempt * 5_000);
            console.warn(
                `[community] bank unreachable (attempt ${attempt}), ` +
                `running in degraded mode — retrying in ${delay / 1000}s. ` +
                `Error: ${(err as Error).message}`,
            );
            setTimeout(() => tryInitMonetary(attempt + 1), delay);
        }
    }

    // Annual person-year issuance: on each member's birthday, issue one kinPerPersonYear
    // split by birthdayCirculationFraction (member) and the remainder (retirement pool).
    PersonService.getInstance().onPersonAnniversary(async (person) => {
        const centralBank  = CentralBank.getInstance();
        const siBank       = SocialInsuranceBank.getInstance();
        const treasury     = CommunityTreasury.getInstance();
        const constitution = Constitution.getInstance();

        if (!centralBank.isReady() || !siBank.isReady() || !treasury.isReady()) {
            console.warn(`[community] monetary institutions not ready — skipping annual issuance for @${person.handle}`);
            return;
        }

        try {
            const memberAccount = await bank.getPrimaryAccountAsync(person.id);
            if (!memberAccount) {
                console.warn(`[community] no primary account for @${person.handle} — skipping annual issuance`);
                return;
            }

            // All kin is issued into the community fund first; the fund then
            // distributes per policy: member fraction → member, remainder → insurance fund.
            const annual       = constitution.kinPerPersonYear;
            const memberAmount = Math.floor(annual * constitution.birthdayCirculationFraction);
            const poolAmount   = annual - memberAmount;

            await centralBank.issue(annual, treasury.accountId, "annual issuance — community fund");
            await treasury.transfer(siBank.poolAccountId,    poolAmount,   "annual issuance — insurance fund");
            await treasury.transfer(memberAccount.accountId, memberAmount, "annual issuance — member share");

            siBank.recordContribution(person.id, poolAmount);

            console.log(
                `[community] annual issuance for @${person.handle}: ` +
                `${annual} kin (insurance: ${poolAmount}, member: ${memberAmount})`,
            );
        } catch (err) {
            console.warn(`[community] annual issuance failed for @${person.handle}: ${(err as Error).message}`);
        }
    });

    // Collect community dues monthly — moves kin from member accounts
    // to the treasury. Runs 30 days after startup, then every 30 days.
    // Excludes institutional accounts (issuance, SI pool, treasury itself).
    const runCommunityDues = (): void => {
        const centralBank  = CentralBank.getInstance();
        const siBank       = SocialInsuranceBank.getInstance();
        const treasury     = CommunityTreasury.getInstance();
        const constitution = Constitution.getInstance();
        if (!centralBank.isReady() || !siBank.isReady() || !treasury.isReady()) {
            console.warn("[community] monetary institutions not ready — skipping community dues collection");
            return;
        }
        treasury.collectDues(
            constitution.communityDuesRate,
            constitution.demurrageFloor,
            [centralBank.issuanceAccountId, siBank.poolAccountId],
        ).then(({ count }) => {
            console.log(`[community] community dues collected from ${count} accounts`);
        }).catch(err => {
            console.error("[community] community dues collection failed:", err);
        });
    };
    // Run the dues check daily; collectDues() fires only when a full 30-day
    // cycle has elapsed. Using a daily tick avoids Node.js's 32-bit timer
    // overflow (setTimeout > ~24.8 days fires immediately).
    let lastDuesDate: Date | null = null;
    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    setInterval(() => {
        const now = new Date();
        if (
            lastDuesDate === null ||
            now.getTime() - lastDuesDate.getTime() >= 30 * MS_PER_DAY
        ) {
            lastDuesDate = now;
            runCommunityDues();
        }
    }, MS_PER_DAY);

    // Check birthdays once at startup, then every 24 hours.
    const runAnniversaryCheck = (): void => {
        PersonService.getInstance().checkAnniversaries().catch(err =>
            console.error("[community] anniversary check failed:", err),
        );
    };
    runAnniversaryCheck();
    setInterval(runAnniversaryCheck, 24 * 60 * 60 * 1000);

    // Start without awaiting — governance routes come up immediately.
    void tryInitMonetary();

    // ── SMS banking (non-fatal — modem may not be present) ────────────────
    // Set SMS_MODEM_PATH to enable (e.g. /dev/ttyUSB0).
    // In Docker, pass the device through:
    //   devices:
    //     - "/dev/ttyUSB0:/dev/ttyUSB0"
    const modemPath = process.env.SMS_MODEM_PATH;
    if (modemPath) {
        const baudRate   = Number(process.env.SMS_MODEM_BAUD ?? 9600);
        const modemProvider = new GsmModemProvider(modemPath, baudRate);
        modemProvider.init()
            .then(() => {
                SmsService.getInstance().init(bank, modemProvider);
                console.log(`[sms] modem active on ${modemPath}`);
            })
            .catch(err => {
                console.warn(`[sms] modem unavailable on ${modemPath}: ${(err as Error).message}`);
                console.warn("[sms] SMS banking disabled — fix the modem and restart");
            });
    } else {
        console.log("[sms] SMS_MODEM_PATH not set — SMS banking disabled");
    }

    // ── Routes ──────────────────────────────────────────────────────────
    // Cluster routes sit outside the write guard — /status is always
    // readable and /snapshot is primary-gated internally.
    // Register inbound EcfMessage handlers
    MessageDispatcher.getInstance().register("mail.message.deliver",    handleInboundMail,            "async");
    MessageDispatcher.getInstance().register("bank.transfer.receive",   handleBankTransferReceive,    "sync");

    app.use("/api/cluster", clusterRoutes(communitySigner.publicKeyHex));
    app.use("/api",         cluster.replicaWriteGuard(), communityRoutes);
    app.use("/api/node",    networkRouter);
    app.use("/api/message", messageRouter);

    app.get("/health", (_req, res) => {
        const bankReady = CentralBank.getInstance().isReady();
        res.status(bankReady ? 200 : 206).json({
            status: bankReady ? "ok" : "degraded",
            bank: bankReady ? "connected" : "unreachable",
        });
    });

    app.get("/api/config", (_req, res) => {
        const PORT_NUM = Number(process.env.PORT ?? 3002);
        res.json({
            communityUrl: process.env.PUBLIC_COMMUNITY_URL ?? `http://localhost:${PORT_NUM}`,
            bankUrl:      process.env.PUBLIC_BANK_URL      ?? "http://localhost:3001",
            marketUrl:    process.env.PUBLIC_MARKET_URL    ?? "http://localhost:3003",
            mailUrl:      process.env.PUBLIC_MAIL_URL      ?? "http://localhost:3020",
        });
    });

    // Expose the community's public key so federation / other nodes can verify credentials.
    // All replica nodes share communitySigner, so they all return the same publicKey.
    app.get("/api/identity", (_req, res) => {
        const identity = NodeService.getInstance().getIdentity();
        const handle   = Constitution.getInstance().communityHandle;
        res.json({ id: identity.id, entityId: identity.entityId, publicKey: communitySigner.publicKeyHex, name: identity.name, handle });
    });

    app.get("/api/constitution", (_req, res) => {
        res.json(Constitution.getInstance().toDocument());
    });

    // Serve frontend
    const publicDir = join(__dirname, "../public");
    app.use(express.static(publicDir));
    app.get("*splat", (_req, res) => {
        res.sendFile(join(publicDir, "index.html"));
    });

    app.listen(PORT, () => {
        console.log(`[community] listening on port ${PORT} (bank: ${BANK_URL})`);
    });
}

main().catch(err => {
    console.error("[community] startup failed:", err);
    process.exit(1);
});

// Library exports (for tests / consumers of the package)
export { Person } from "./person/Person.js";
export type { PersonCredential, LanguageProficiency } from "./person/Person.js";
export { PersonLoader } from "./person/PersonLoader.js";
export { PersonService } from "./person/PersonService.js";
export type { PersonPatch } from "./person/PersonService.js";
export { CommunityRole } from "./common/CommunityRole.js";
export { CommunityRoleLoader } from "./common/domain/CommunityRoleLoader.js";
export { FunctionalUnit } from "./common/domain/FunctionalUnit.js";
export { FunctionalDomain } from "./common/domain/FunctionalDomain.js";
export { FunctionalUnitLoader } from "./common/domain/FunctionalUnitLoader.js";
export { FunctionalDomainLoader } from "./common/domain/FunctionalDomainLoader.js";
export { UnitTemplateRegistry } from "./common/domain/UnitTemplateRegistry.js";
export { LeaderPool } from "./governance/LeaderPool.js";
export { LeaderPoolLoader } from "./governance/LeaderPoolLoader.js";
export { DomainService } from "./DomainService.js";
export { BankClient } from "@ecf/core";
