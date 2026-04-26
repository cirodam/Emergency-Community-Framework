import express from "express";
import { fileURLToPath } from "url";
import { dirname, join, resolve } from "path";
import { NodeService, DataManifest, networkRouter } from "@ecf/core";
import { PersonLoader } from "./person/PersonLoader.js";
import { PersonService } from "./person/PersonService.js";
import { CommunityRoleLoader } from "./common/domain/CommunityRoleLoader.js";
import { FunctionalUnitLoader } from "./common/domain/FunctionalUnitLoader.js";
import { FunctionalDomainLoader } from "./common/domain/FunctionalDomainLoader.js";
import { LeaderPoolLoader } from "./governance/LeaderPoolLoader.js";
import { Constitution } from "./governance/Constitution.js";
import { ConstitutionLoader } from "./governance/ConstitutionLoader.js";
import { DomainService } from "./DomainService.js";
import { BankClient } from "./BankClient.js";
import { CentralBank } from "./domains/central_bank/CentralBank.js";
import { CentralBankLoader } from "./domains/central_bank/CentralBankLoader.js";
import { CurrencyBoard } from "./domains/currency_board/CurrencyBoard.js";
import { CurrencyBoardLoader } from "./domains/currency_board/CurrencyBoardLoader.js";
import { SocialInsuranceBank } from "./domains/social_insurance/SocialInsuranceBank.js";
import { SocialInsuranceBankLoader } from "./domains/social_insurance/SocialInsuranceBankLoader.js";
import { SocialInsuranceMemberLoader } from "./domains/social_insurance/SocialInsuranceMemberLoader.js";
import communityRoutes from "./routes/communityRoutes.js";
import { CommunityBankDomain } from "./domains/community_bank/CommunityBankDomain.js";
import { CommunityTreasury } from "./domains/community_treasury/CommunityTreasury.js";
import { CommunityTreasuryLoader } from "./domains/community_treasury/CommunityTreasuryLoader.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const PORT     = Number(process.env.PORT     ?? 3002);
const DATA_DIR = process.env.DATA_DIR ?? join(__dirname, "../../data");
const BANK_URL = process.env.BANK_URL  ?? "http://localhost:3001";

const app = express();

app.use(express.json({
    verify: (req, _res, buf) => {
        (req as typeof req & { rawBody: string }).rawBody = buf.toString("utf-8");
    },
}));

async function main(): Promise<void> {
    // ── Node identity ──────────────────────────────────────────────────────
    await NodeService.getInstance().init({
        type:    "community",
        name:    process.env.NODE_NAME    ?? "community",
        address: process.env.NODE_ADDRESS ?? `http://localhost:${PORT}`,
        dataDir: resolve(DATA_DIR, "network"),
        seeds:   (process.env.BOOTSTRAP_PEERS ?? "").split(",").filter(Boolean),
    });

    DataManifest.getInstance().init(
        body => NodeService.getInstance().getSigner().signBody(body),
        NodeService.getInstance().getSigner().publicKeyHex,
    );

    // ── Constitution ───────────────────────────────────────────────────────
    new ConstitutionLoader(resolve(DATA_DIR, "governance")).load();

    // ── Persons ────────────────────────────────────────────────────────────
    const personLoader = new PersonLoader(resolve(DATA_DIR, "persons"));
    PersonService.getInstance().init(personLoader);

    // ── Domain registries ──────────────────────────────────────────────────
    const domainSvc = DomainService.getInstance();
    domainSvc.init(
        new FunctionalDomainLoader(resolve(DATA_DIR, "domains")),
        new FunctionalUnitLoader(resolve(DATA_DIR, "units")),
        new CommunityRoleLoader(resolve(DATA_DIR, "roles")),
        new LeaderPoolLoader(resolve(DATA_DIR, "pools")),
    );

    // Register the four monetary/financial domains so they participate in
    // governance — they get leader pools, roles, and appear in the domain API.
    // Monetary init (async bank connection) happens separately below.
    domainSvc.registerDomain(CentralBank.getInstance());
    domainSvc.registerDomain(CurrencyBoard.getInstance());
    domainSvc.registerDomain(SocialInsuranceBank.getInstance());
    domainSvc.registerDomain(CommunityTreasury.getInstance());
    domainSvc.registerDomain(CommunityBankDomain.getInstance());

    // ── Monetary institutions (non-fatal — bank may be unreachable) ────────
    const bank = new BankClient(BANK_URL, body => NodeService.getInstance().getSigner().signBody(body));

    // On join: open a primary kin account and issue the age-derived endowment.
    // Non-fatal: if the bank is temporarily unreachable the person record still
    // commits — the monetary operations are best-effort at join time.
    PersonService.getInstance().onPersonJoined(async (person) => {
        const displayName = `${person.firstName} ${person.lastName}`;
        const centralBank = CentralBank.getInstance();
        const siBank      = SocialInsuranceBank.getInstance();
        const treasury    = CommunityTreasury.getInstance();
        const constitution = Constitution.getInstance();

        try {
            const memberAccount = await bank.openAccount(person.id, displayName, "kin");
            console.log(`[community] opened bank account for @${person.handle}`);

            if (!centralBank.isReady() || !siBank.isReady() || !treasury.isReady()) {
                console.warn(`[community] monetary institutions not ready — skipping endowment for @${person.handle}`);
                return;
            }

            // Compute age-derived endowment: floor(age in years) × kinPerPersonYear
            const MS_PER_YEAR  = 365.25 * 24 * 60 * 60 * 1000;
            const ageInYears   = Math.floor((Date.now() - person.birthDate.getTime()) / MS_PER_YEAR);
            const endowment    = ageInYears * constitution.kinPerPersonYear;

            if (endowment <= 0) {
                console.log(`[community] zero endowment for @${person.handle} (age ${ageInYears}) — skipping issuance`);
                return;
            }

            // Split: poolFraction → retirement pool, seedBalance → member, remainder → treasury
            const poolAmount     = Math.floor(endowment * constitution.endowmentPoolFraction);
            const circulating    = endowment - poolAmount;
            const seedAmount     = Math.min(constitution.endowmentSeedBalance, circulating);
            const treasuryAmount = circulating - seedAmount;

            await centralBank.issue(poolAmount,     siBank.poolAccountId,     "join endowment — retirement pool");
            await centralBank.issue(seedAmount,     memberAccount.accountId,  "join endowment — seed balance");
            await centralBank.issue(treasuryAmount, treasury.accountId,       "join endowment — community treasury");

            siBank.recordContribution(person.id, poolAmount);

            console.log(
                `[community] issued join endowment for @${person.handle}: ` +
                `${endowment} kin (pool: ${poolAmount}, seed: ${seedAmount}, treasury: ${treasuryAmount})`,
            );
        } catch (err) {
            console.warn(`[community] join handler failed for @${person.handle}: ${(err as Error).message}`);
        }
    });

    const centralBankLoader   = new CentralBankLoader(DATA_DIR);
    const currencyBoardLoader = new CurrencyBoardLoader(DATA_DIR);
    const siBankLoader        = new SocialInsuranceBankLoader(DATA_DIR);
    const siMemberLoader      = new SocialInsuranceMemberLoader(resolve(DATA_DIR, "si_members"));
    const treasuryLoader      = new CommunityTreasuryLoader(DATA_DIR);

    async function initMonetaryInstitutions(): Promise<void> {
        await CentralBank.getInstance().init(bank, centralBankLoader);
        await CurrencyBoard.getInstance().init(bank, currencyBoardLoader);
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
        const constitution = Constitution.getInstance();

        if (!centralBank.isReady() || !siBank.isReady()) {
            console.warn(`[community] monetary institutions not ready — skipping annual issuance for @${person.handle}`);
            return;
        }

        try {
            const memberAccount = await bank.getPrimaryAccountAsync(person.id);
            if (!memberAccount) {
                console.warn(`[community] no primary account for @${person.handle} — skipping annual issuance`);
                return;
            }

            const annual          = constitution.kinPerPersonYear;
            const memberAmount    = Math.floor(annual * constitution.birthdayCirculationFraction);
            const poolAmount      = annual - memberAmount;

            await centralBank.issue(poolAmount,   siBank.poolAccountId,    "annual issuance — retirement pool");
            await centralBank.issue(memberAmount, memberAccount.accountId, "annual issuance — circulating");

            siBank.recordContribution(person.id, poolAmount);

            console.log(
                `[community] annual issuance for @${person.handle}: ` +
                `${annual} kin (pool: ${poolAmount}, member: ${memberAmount})`,
            );
        } catch (err) {
            console.warn(`[community] annual issuance failed for @${person.handle}: ${(err as Error).message}`);
        }
    });

    // Collect the community levy monthly — moves kin from member accounts
    // to the treasury. Runs 30 days after startup, then every 30 days.
    // Excludes institutional accounts (issuance, SI pool, treasury itself).
    const runCommunityLevy = (): void => {
        const centralBank  = CentralBank.getInstance();
        const siBank       = SocialInsuranceBank.getInstance();
        const treasury     = CommunityTreasury.getInstance();
        const constitution = Constitution.getInstance();
        if (!centralBank.isReady() || !siBank.isReady() || !treasury.isReady()) {
            console.warn("[community] monetary institutions not ready — skipping community levy");
            return;
        }
        treasury.collectLevy(
            constitution.communityLevyRate,
            constitution.demurrageFloor,
            [centralBank.issuanceAccountId, siBank.poolAccountId],
        ).then(({ count }) => {
            console.log(`[community] community levy collected from ${count} accounts`);
        }).catch(err => {
            console.error("[community] community levy failed:", err);
        });
    };
    // Run the levy check daily; collectLevy() fires only when a full 30-day
    // cycle has elapsed. Using a daily tick avoids Node.js's 32-bit timer
    // overflow (setTimeout > ~24.8 days fires immediately).
    let lastLevyDate: Date | null = null;
    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    setInterval(() => {
        const now = new Date();
        if (
            lastLevyDate === null ||
            now.getTime() - lastLevyDate.getTime() >= 30 * MS_PER_DAY
        ) {
            lastLevyDate = now;
            runCommunityLevy();
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

    // ── Routes ─────────────────────────────────────────────────────────────
    app.use("/api",       communityRoutes);
    app.use("/api/node",  networkRouter);

    app.get("/health", (_req, res) => {
        const bankReady = CentralBank.getInstance().isReady();
        res.status(bankReady ? 200 : 206).json({
            status: bankReady ? "ok" : "degraded",
            bank: bankReady ? "connected" : "unreachable",
        });
    });

    // Expose the community's public key so federation / other nodes can verify credentials
    app.get("/api/identity", (_req, res) => {
        const identity = NodeService.getInstance().getIdentity();
        res.json({ id: identity.id, publicKey: identity.publicKey, name: identity.name });
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
export type { BudgetLineItem, DomainBudget } from "./common/domain/FunctionalDomain.js";
export { FunctionalUnitLoader } from "./common/domain/FunctionalUnitLoader.js";
export { FunctionalDomainLoader } from "./common/domain/FunctionalDomainLoader.js";
export { UnitTemplateRegistry } from "./common/domain/UnitTemplateRegistry.js";
export { LeaderPool } from "./governance/LeaderPool.js";
export { LeaderPoolLoader } from "./governance/LeaderPoolLoader.js";
export { DomainService } from "./DomainService.js";
export { BankClient } from "./BankClient.js";
