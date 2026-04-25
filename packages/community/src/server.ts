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

    // Domains are code-defined. Import and register them here as they are created.
    // Example (uncomment when domain subclasses exist):
    //   import { FoodDomain } from "./domains/FoodDomain.js";
    //   domainSvc.registerDomain(FoodDomain.getInstance());

    // ── Monetary institutions ──────────────────────────────────────────────
    const bank = new BankClient(BANK_URL);
    await CentralBank.getInstance().init(bank, new CentralBankLoader(DATA_DIR));
    await CurrencyBoard.getInstance().init(bank, new CurrencyBoardLoader(DATA_DIR));
    await SocialInsuranceBank.getInstance().init(
        bank,
        new SocialInsuranceBankLoader(DATA_DIR),
        new SocialInsuranceMemberLoader(resolve(DATA_DIR, "si_members")),
    );

    // ── Routes ─────────────────────────────────────────────────────────────
    app.use("/api",       communityRoutes);
    app.use("/api/node",  networkRouter);

    app.get("/health", (_req, res) => { res.json({ status: "ok" }); });

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
