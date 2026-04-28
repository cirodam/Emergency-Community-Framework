import express from "express";
import { fileURLToPath } from "url";
import { dirname, join, resolve } from "path";
import { NodeService, DataManifest, networkRouter, messageRouter, MessageDispatcher } from "@ecf/core";
import { GlobeMemberLoader } from "./GlobeMemberLoader.js";
import { GlobeMemberService } from "./GlobeMemberService.js";
import { GlobeApplicationLoader } from "./GlobeApplicationLoader.js";
import { GlobeApplicationService } from "./GlobeApplicationService.js";
import { GlobeClearingHouse } from "./domains/central_bank/GlobeClearingHouse.js";
import { GlobeClearingHouseLoader } from "./domains/central_bank/GlobeClearingHouseLoader.js";
import { GlobeTreasury } from "./domains/treasury/GlobeTreasury.js";
import { GlobeTreasuryLoader } from "./domains/treasury/GlobeTreasuryLoader.js";
import { GlobeConstitution } from "./governance/GlobeConstitution.js";
import { BankClient } from "@ecf/core";
import { GlobeDemurrageScheduler } from "./GlobeDemurrageScheduler.js";
import globeRoutes from "./routes/globeRoutes.js";
import { handleBankTransferRoute } from "./routes/GlobeController.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const PORT     = Number(process.env.PORT     ?? 3030);
const DATA_DIR = process.env.DATA_DIR ?? join(__dirname, "../../data");
const BANK_URL = process.env.BANK_URL  ?? "http://localhost:3031";

const FOUNDING_COMMONWEALTH_URL = process.env.FOUNDING_COMMONWEALTH_URL ?? "";

const app = express();

app.use(express.json({
    verify: (req, _res, buf) => {
        (req as typeof req & { rawBody: string }).rawBody = buf.toString("utf-8");
    },
}));

/**
 * On first boot, if FOUNDING_COMMONWEALTH_URL is set and no members exist yet,
 * fetch the commonwealth's identity and register it as the founding member.
 */
async function bootstrapFoundingMember(bankClient: BankClient, attempt = 1): Promise<void> {
    if (!FOUNDING_COMMONWEALTH_URL) return;

    const memberSvc = GlobeMemberService.getInstance();
    if (memberSvc.getAll().some(m => m.isFounder)) return;

    try {
        const base = FOUNDING_COMMONWEALTH_URL.replace(/\/$/, "");
        const res  = await fetch(`${base}/api/identity`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const identity = await res.json() as { id: string; entityId?: string; publicKey: string; name: string; handle?: string };

        const handle = identity.handle?.trim()
            || identity.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 32)
            || "founding-commonwealth";

        const entityId = identity.entityId ?? identity.id;
        const member  = memberSvc.add(identity.name, handle, identity.id, identity.publicKey, base, entityId, true);
        await bankClient.createOwner("institution", identity.name, { ownerId: member.id });
        const account = await bankClient.openAccount(member.id, `${identity.name} Clearing Account`, "kithe");
        memberSvc.setBankAccount(member.id, account.accountId);

        console.log(`[globe] founding member registered: "${identity.name}" (member ${member.id})`);
    } catch (err) {
        const delay = Math.min(30_000, attempt * 5_000);
        console.warn(
            `[globe] could not reach founding commonwealth at ${FOUNDING_COMMONWEALTH_URL} ` +
            `(attempt ${attempt}), retrying in ${delay / 1000}s: ${(err as Error).message}`,
        );
        await new Promise<void>(r => setTimeout(r, delay));
        return bootstrapFoundingMember(bankClient, attempt + 1);
    }
}

async function main(): Promise<void> {
    await NodeService.getInstance().init({
        type:     "globe",
        name:     process.env.NODE_NAME     ?? "globe",
        address:  process.env.NODE_ADDRESS  ?? `http://localhost:${PORT}`,
        entityId: process.env.NODE_ENTITY_ID,
        dataDir:  resolve(DATA_DIR, "network"),
        seeds:    (process.env.BOOTSTRAP_PEERS ?? "").split(",").filter(Boolean),
    });

    DataManifest.getInstance().init(
        body => NodeService.getInstance().getSigner().signBody(body),
        NodeService.getInstance().getSigner().publicKeyHex,
    );

    // ── Member commonwealths ───────────────────────────────────────────────
    const memberLoader = new GlobeMemberLoader(resolve(DATA_DIR, "members"));
    GlobeMemberService.getInstance().init(memberLoader);

    const appLoader = new GlobeApplicationLoader(resolve(DATA_DIR, "applications"));
    GlobeApplicationService.getInstance().init(appLoader);

    // ── Clearing house ─────────────────────────────────────────────────────
    const bankClient = new BankClient(
        BANK_URL,
        body => NodeService.getInstance().getSigner().signBody(body),
        "kithe",
    );
    const chLoader = new GlobeClearingHouseLoader(resolve(DATA_DIR, "domains"));
    await GlobeClearingHouse.getInstance().init(bankClient, chLoader);

    // ── Treasury ───────────────────────────────────────────────────────────
    const treasuryLoader = new GlobeTreasuryLoader(resolve(DATA_DIR, "domains"));
    await GlobeTreasury.getInstance().init(bankClient, treasuryLoader);

    // ── Constitution ───────────────────────────────────────────────────────
    GlobeConstitution.getInstance().load(resolve(DATA_DIR, "governance"));

    // ── Founding member bootstrap ──────────────────────────────────────────
    await bootstrapFoundingMember(bankClient);

    // ── Monthly demurrage sweep ────────────────────────────────────────────
    new GlobeDemurrageScheduler().start();

    // ── Message handlers ───────────────────────────────────────────────────────
    MessageDispatcher.getInstance().register("bank.transfer.route", handleBankTransferRoute, "sync");

    // ── Routes ─────────────────────────────────────────────────────────────
    app.use("/api",      globeRoutes);
    app.use("/api/node",    networkRouter);
    app.use("/api/message", messageRouter);

    app.get("/api/identity", (_req, res) => {
        const node     = NodeService.getInstance();
        const identity = node.getIdentity();
        const handle   = process.env.GLOBE_HANDLE
            ?? identity.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 32);
        res.json({
            id:        identity.id,
            entityId:  identity.entityId,
            publicKey: node.getSigner().publicKeyHex,
            type:      "globe",
            name:      identity.name,
            handle,
        });
    });

    app.get("/health", (_req, res) => {
        res.json({
            status:      "ok",
            bankUrl:     BANK_URL,
            memberCount: GlobeMemberService.getInstance().getAll().length,
        });
    });

    app.listen(PORT, () => {
        console.log(`[globe] listening on port ${PORT} (bank: ${BANK_URL})`);
    });
}

main().catch(err => {
    console.error("[globe] startup failed:", err);
    process.exit(1);
});
