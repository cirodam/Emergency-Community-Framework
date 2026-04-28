import express from "express";
import { fileURLToPath } from "url";
import { dirname, join, resolve } from "path";
import { NodeService, DataManifest, networkRouter, messageRouter, MessageDispatcher } from "@ecf/core";
import { FederationMemberLoader } from "./FederationMemberLoader.js";
import { FederationMemberService } from "./FederationMemberService.js";
import { FederationApplicationLoader } from "./FederationApplicationLoader.js";
import { FederationApplicationService } from "./FederationApplicationService.js";
import { FederationClearingHouse } from "./domains/central_bank/FederationClearingHouse.js";
import { FederationClearingHouseLoader } from "./domains/central_bank/FederationClearingHouseLoader.js";
import { FederationTreasury } from "./domains/treasury/FederationTreasury.js";
import { FederationTreasuryLoader } from "./domains/treasury/FederationTreasuryLoader.js";
import { FederationConstitution } from "./governance/FederationConstitution.js";
import { FederationDomainService } from "./common/FederationDomainService.js";
import { InsuranceDomain } from "./domains/insurance/InsuranceDomain.js";
import { LogisticsDomain } from "./domains/logistics/LogisticsDomain.js";
import { BankClient } from "@ecf/core";
import { CensusRecordLoader } from "./census/CensusRecordLoader.js";
import { FederationCensusService } from "./census/FederationCensusService.js";
import federationRoutes from "./routes/federationRoutes.js";
import { FederationDemurrageScheduler } from "./FederationDemurrageScheduler.js";
import { CommonwealthMembershipService } from "./CommonwealthMembershipService.js";
import { handleCensusMessage, handleBankTransferRoute } from "./routes/FederationController.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const PORT     = Number(process.env.PORT     ?? 3010);
const DATA_DIR = process.env.DATA_DIR ?? join(__dirname, "../../data");
const BANK_URL = process.env.BANK_URL  ?? "http://localhost:3011";

const FOUNDING_COMMUNITY_URL = process.env.FOUNDING_COMMUNITY_URL ?? "";
const FOUNDING_COMMONWEALTH_URL = process.env.FOUNDING_COMMONWEALTH_URL ?? "";

const app = express();

app.use(express.json({
    verify: (req, _res, buf) => {
        (req as typeof req & { rawBody: string }).rawBody = buf.toString("utf-8");
    },
}));

/**
 * On first boot, if FOUNDING_COMMUNITY_URL is set and no members have been
 * registered yet, fetch the community's identity and register it as the
 * founding member — bypassing the normal application process.
 *
 * Retries indefinitely with backoff so the federation can start before the
 * community node is reachable (common in docker-compose).
 */
async function bootstrapFoundingMember(bank: BankClient, attempt = 1): Promise<void> {
    if (!FOUNDING_COMMUNITY_URL) return;

    const memberSvc = FederationMemberService.getInstance();
    if (memberSvc.getAll().some(m => m.isFounder)) return; // already done

    try {
        const base = FOUNDING_COMMUNITY_URL.replace(/\/$/, "");
        const res  = await fetch(`${base}/api/identity`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const identity = await res.json() as { id: string; entityId?: string; publicKey: string; name: string; handle?: string };

        // Derive a handle from the community name if it hasn't set one yet
        const handle = identity.handle?.trim()
            || identity.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 32)
            || "founding-community";

        const entityId = identity.entityId ?? identity.id;
        const member  = memberSvc.add(identity.name, handle, identity.id, identity.publicKey, base, entityId, true);
        const owner   = await bank.createOwner("institution", identity.name);
        const account = await bank.openAccount(owner.ownerId, `${identity.name} — kithe reserve`, "kithe");
        memberSvc.setBankAccount(member.id, account.accountId);

        console.log(`[federation] founding member registered: "${identity.name}" (member ${member.id})`);
    } catch (err) {
        const delay = Math.min(30_000, attempt * 5_000);
        console.warn(
            `[federation] could not reach founding community at ${FOUNDING_COMMUNITY_URL} ` +
            `(attempt ${attempt}), retrying in ${delay / 1000}s: ${(err as Error).message}`,
        );
        await new Promise<void>(resolve => setTimeout(resolve, delay));
        return bootstrapFoundingMember(bank, attempt + 1);
    }
}

async function main(): Promise<void> {
    await NodeService.getInstance().init({
        type:     "federation",
        name:     process.env.NODE_NAME     ?? "federation",
        address:  process.env.NODE_ADDRESS  ?? `http://localhost:${PORT}`,
        entityId: process.env.NODE_ENTITY_ID,
        dataDir:  resolve(DATA_DIR, "network"),
        seeds:    (process.env.BOOTSTRAP_PEERS ?? "").split(",").filter(Boolean),
    });

    DataManifest.getInstance().init(
        body => NodeService.getInstance().getSigner().signBody(body),
        NodeService.getInstance().getSigner().publicKeyHex,
    );

    // ── Member communities ─────────────────────────────────────────────────
    const memberLoader = new FederationMemberLoader(resolve(DATA_DIR, "members"));
    FederationMemberService.getInstance().init(memberLoader);

    const appLoader = new FederationApplicationLoader(resolve(DATA_DIR, "applications"));
    FederationApplicationService.getInstance().init(appLoader);

    // ── Federation clearing house ───────────────────────────────────────
    const bank = new BankClient(
        BANK_URL,
        body => NodeService.getInstance().getSigner().signBody(body),
        "kithe",
    );
    const chLoader = new FederationClearingHouseLoader(resolve(DATA_DIR, "domains"));
    await FederationClearingHouse.getInstance().init(bank, chLoader);

    // ── Federation treasury ────────────────────────────────────────────────
    const treasuryLoader = new FederationTreasuryLoader(resolve(DATA_DIR, "domains"));
    await FederationTreasury.getInstance().init(bank, treasuryLoader);

    // ── Federation constitution ────────────────────────────────────────────
    FederationConstitution.getInstance().load(resolve(DATA_DIR, "governance"));

    // ── Member census ──────────────────────────────────────────────────────
    const censusLoader = new CensusRecordLoader(resolve(DATA_DIR, "census"));
    FederationCensusService.getInstance().init(censusLoader);

    // ── Federation functional domains ─────────────────────────────────────
    const domainSvc = FederationDomainService.getInstance();
    domainSvc.registerDomain(InsuranceDomain.getInstance());
    domainSvc.registerDomain(LogisticsDomain.getInstance());
    // ── Commonwealth membership ─────────────────────────────────────────────
    CommonwealthMembershipService.getInstance(resolve(DATA_DIR, "network"));
    // ── Founding member bootstrap ──────────────────────────────────────────
    await bootstrapFoundingMember(bank);

    // ── Monthly demurrage sweep ────────────────────────────────────────────
    // Runs on the 1st of each month (UTC). Charges communities whose federation
    // account balance exceeds (creditLineKin × surplusThresholdMultiple) at
    // surplusDemurrageRate, flowing the excess to the treasury.
    new FederationDemurrageScheduler().start();

    // ── Message handlers ──────────────────────────────────────────
    const dispatcher = MessageDispatcher.getInstance();
    dispatcher.register("governance.census.submit", handleCensusMessage,     "sync");
    dispatcher.register("bank.transfer.route",      handleBankTransferRoute, "sync");

    // ── Routes ─────────────────────────────────────────────────────────────
    app.use("/api",      federationRoutes);
    app.use("/api/node",    networkRouter);
    app.use("/api/message", messageRouter);

    // Identity endpoint — member communities and other nodes resolve public key here
    app.get("/api/identity", (_req, res) => {
        const node = NodeService.getInstance();
        const identity = node.getIdentity();
        const cwRecord = CommonwealthMembershipService.getInstance().getStatus();
        res.json({
            id:                identity.id,
            entityId:          identity.entityId,
            publicKey:         node.getSigner().publicKeyHex,
            type:              "federation",
            name:              identity.name,
            handle:            cwRecord?.federationHandle    ?? null,
            commonwealthHandle: cwRecord?.commonwealthHandle ?? null,
            globeHandle:       cwRecord?.globeHandle         ?? null,
        });
    });

    // Membership-chain endpoint — member communities resolve upstream URLs here
    app.get("/api/membership-chain", async (_req, res) => {
        const cwRecord = CommonwealthMembershipService.getInstance().getStatus();
        if (!cwRecord || cwRecord.status !== "approved") {
            res.json({ commonwealthUrl: null, commonwealthHandle: null, globeUrl: null, globeHandle: null });
            return;
        }

        let globeUrl: string | null = null;
        try {
            const r = await fetch(`${cwRecord.commonwealthUrl.replace(/\/$/, "")}/api/identity`);
            if (r.ok) {
                const id = await r.json() as { globeUrl?: string | null };
                globeUrl = id.globeUrl ?? null;
            }
        } catch { /* non-fatal */ }

        res.json({
            commonwealthUrl:    cwRecord.commonwealthUrl,
            commonwealthHandle: cwRecord.commonwealthHandle ?? null,
            globeUrl,
            globeHandle:        cwRecord.globeHandle ?? null,
        });
    });

    app.get("/health", (_req, res) => {
        res.json({
            status:      "ok",
            bankUrl:     BANK_URL,
            memberCount: FederationMemberService.getInstance().getAll().length,
        });
    });

    // Serve frontend
    const publicDir = join(__dirname, "../public");
    app.use(express.static(publicDir));
    app.get("*splat", (_req, res) => {
        res.sendFile(join(publicDir, "index.html"));
    });

    app.listen(PORT, () => {
        console.log(`[federation] listening on port ${PORT} (bank: ${BANK_URL})`);
    });
}

main().catch(err => {
    console.error("[federation] startup failed:", err);
    process.exit(1);
});
