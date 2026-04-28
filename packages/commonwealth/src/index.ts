import express from "express";
import { fileURLToPath } from "url";
import { dirname, join, resolve } from "path";
import { NodeService, DataManifest, networkRouter, messageRouter, MessageDispatcher } from "@ecf/core";
import { CommonwealthMemberLoader } from "./CommonwealthMemberLoader.js";
import { CommonwealthMemberService } from "./CommonwealthMemberService.js";
import { CommonwealthApplicationLoader } from "./CommonwealthApplicationLoader.js";
import { CommonwealthApplicationService } from "./CommonwealthApplicationService.js";
import { CommonwealthClearingHouse } from "./domains/central_bank/CommonwealthClearingHouse.js";
import { CommonwealthClearingHouseLoader } from "./domains/central_bank/CommonwealthClearingHouseLoader.js";
import { CommonwealthTreasury } from "./domains/treasury/CommonwealthTreasury.js";
import { CommonwealthTreasuryLoader } from "./domains/treasury/CommonwealthTreasuryLoader.js";
import { CommonwealthConstitution } from "./governance/CommonwealthConstitution.js";
import { BankClient } from "@ecf/core";
import { CommonwealthDemurrageScheduler } from "./CommonwealthDemurrageScheduler.js";
import { GlobeMembershipService } from "./GlobeMembershipService.js";
import commonwealthRoutes from "./routes/commonwealthRoutes.js";
import { handleBankTransferRoute } from "./routes/CommonwealthController.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const PORT     = Number(process.env.PORT     ?? 3020);
const DATA_DIR = process.env.DATA_DIR ?? join(__dirname, "../../data");
const BANK_URL = process.env.BANK_URL  ?? "http://localhost:3021";

const FOUNDING_FEDERATION_URL = process.env.FOUNDING_FEDERATION_URL ?? "";
const FOUNDING_GLOBE_URL      = process.env.FOUNDING_GLOBE_URL      ?? "";

const app = express();

app.use(express.json({
    verify: (req, _res, buf) => {
        (req as typeof req & { rawBody: string }).rawBody = buf.toString("utf-8");
    },
}));

/**
 * On first boot, if FOUNDING_FEDERATION_URL is set and no members exist yet,
 * fetch the federation's identity and register it as the founding member.
 */
async function bootstrapFoundingMember(bankClient: BankClient, attempt = 1): Promise<void> {
    if (!FOUNDING_FEDERATION_URL) return;

    const memberSvc = CommonwealthMemberService.getInstance();
    if (memberSvc.getAll().some(m => m.isFounder)) return;

    try {
        const base = FOUNDING_FEDERATION_URL.replace(/\/$/, "");
        const res  = await fetch(`${base}/api/identity`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const identity = await res.json() as { id: string; entityId?: string; publicKey: string; name: string; handle?: string };

        const handle = identity.handle?.trim()
            || identity.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 32)
            || "founding-federation";

        const entityId = identity.entityId ?? identity.id;
        const member  = memberSvc.add(identity.name, handle, identity.id, identity.publicKey, base, entityId, true);
        await bankClient.createOwner("institution", identity.name, { ownerId: member.id });
        const account = await bankClient.openAccount(member.id, `${identity.name} Clearing Account`, "kithe");
        memberSvc.setBankAccount(member.id, account.accountId);

        console.log(`[commonwealth] founding member registered: "${identity.name}" (member ${member.id})`);
    } catch (err) {
        const delay = Math.min(30_000, attempt * 5_000);
        console.warn(
            `[commonwealth] could not reach founding federation at ${FOUNDING_FEDERATION_URL} ` +
            `(attempt ${attempt}), retrying in ${delay / 1000}s: ${(err as Error).message}`,
        );
        await new Promise<void>(r => setTimeout(r, delay));
        return bootstrapFoundingMember(bankClient, attempt + 1);
    }
}

async function main(): Promise<void> {
    await NodeService.getInstance().init({
        type:     "commonwealth",
        name:     process.env.NODE_NAME     ?? "commonwealth",
        address:  process.env.NODE_ADDRESS  ?? `http://localhost:${PORT}`,
        entityId: process.env.NODE_ENTITY_ID,
        dataDir:  resolve(DATA_DIR, "network"),
        seeds:    (process.env.BOOTSTRAP_PEERS ?? "").split(",").filter(Boolean),
    });

    DataManifest.getInstance().init(
        body => NodeService.getInstance().getSigner().signBody(body),
        NodeService.getInstance().getSigner().publicKeyHex,
    );

    // ── Member federations ─────────────────────────────────────────────────
    const memberLoader = new CommonwealthMemberLoader(resolve(DATA_DIR, "members"));
    CommonwealthMemberService.getInstance().init(memberLoader);

    const appLoader = new CommonwealthApplicationLoader(resolve(DATA_DIR, "applications"));
    CommonwealthApplicationService.getInstance().init(appLoader);

    // ── Clearing house ─────────────────────────────────────────────────────
    const bankClient = new BankClient(
        BANK_URL,
        body => NodeService.getInstance().getSigner().signBody(body),
        "kithe",
    );
    const chLoader = new CommonwealthClearingHouseLoader(resolve(DATA_DIR, "domains"));
    await CommonwealthClearingHouse.getInstance().init(bankClient, chLoader);

    // ── Treasury ───────────────────────────────────────────────────────────
    const treasuryLoader = new CommonwealthTreasuryLoader(resolve(DATA_DIR, "domains"));
    await CommonwealthTreasury.getInstance().init(bankClient, treasuryLoader);

    // ── Constitution ───────────────────────────────────────────────────────
    CommonwealthConstitution.getInstance().load(resolve(DATA_DIR, "governance"));

    // ── Globe membership ─────────────────────────────────────────────────────────
    GlobeMembershipService.getInstance(resolve(DATA_DIR, "network"));

    // ── Founding member bootstrap ──────────────────────────────────────────
    await bootstrapFoundingMember(bankClient);

    // ── Monthly demurrage sweep ────────────────────────────────────────────
    new CommonwealthDemurrageScheduler().start();

    // ── Message handlers ───────────────────────────────────────────────────
    MessageDispatcher.getInstance().register("bank.transfer.route", handleBankTransferRoute, "sync");

    // ── Routes ─────────────────────────────────────────────────────────────
    app.use("/api",      commonwealthRoutes);
    app.use("/api/node",    networkRouter);
    app.use("/api/message", messageRouter);

    app.get("/api/identity", (_req, res) => {
        const node      = NodeService.getInstance();
        const globeRec  = GlobeMembershipService.getInstance().getStatus();
        res.json({
            id:          node.getIdentity().id,
            entityId:    node.getIdentity().entityId,
            publicKey:   node.getSigner().publicKeyHex,
            type:        "commonwealth",
            name:        node.getIdentity().name,
            handle:           globeRec?.commonwealthHandle ?? null,
            globeHandle:      globeRec?.globeHandle        ?? null,
            globeUrl:         globeRec?.globeUrl           ?? null,
        });
    });

    app.get("/health", (_req, res) => {
        res.json({
            status:      "ok",
            bankUrl:     BANK_URL,
            memberCount: CommonwealthMemberService.getInstance().getAll().length,
        });
    });

    app.listen(PORT, () => {
        console.log(`[commonwealth] listening on port ${PORT} (bank: ${BANK_URL})`);
    });
}

main().catch(err => {
    console.error("[commonwealth] startup failed:", err);
    process.exit(1);
});
