import express from "express";
import { fileURLToPath } from "url";
import { dirname, join, resolve } from "path";
import { NodeService, DataManifest, networkRouter } from "@ecf/core";
import { FederationMemberLoader } from "./FederationMemberLoader.js";
import { FederationMemberService } from "./FederationMemberService.js";
import { FederationApplicationLoader } from "./FederationApplicationLoader.js";
import { FederationApplicationService } from "./FederationApplicationService.js";
import { FederationCentralBank } from "./domains/central_bank/FederationCentralBank.js";
import { FederationCentralBankLoader } from "./domains/central_bank/FederationCentralBankLoader.js";
import { BankClient } from "./BankClient.js";
import federationRoutes from "./routes/federationRoutes.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const PORT     = Number(process.env.PORT     ?? 3010);
const DATA_DIR = process.env.DATA_DIR ?? join(__dirname, "../../data");
const BANK_URL = process.env.BANK_URL  ?? "http://localhost:3011";

const FOUNDING_COMMUNITY_URL = process.env.FOUNDING_COMMUNITY_URL ?? "";

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

        const identity = await res.json() as { id: string; publicKey: string; name: string };

        const member  = memberSvc.add(identity.name, identity.id, identity.publicKey, true);
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
        type:    "federation",
        name:    process.env.NODE_NAME    ?? "federation",
        address: process.env.NODE_ADDRESS ?? `http://localhost:${PORT}`,
        dataDir: resolve(DATA_DIR, "network"),
        seeds:   (process.env.BOOTSTRAP_PEERS ?? "").split(",").filter(Boolean),
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

    // ── Federation central bank (kithe issuer) ─────────────────────────────
    const bank = new BankClient(
        BANK_URL,
        body => NodeService.getInstance().getSigner().signBody(body),
    );
    const cbLoader = new FederationCentralBankLoader(resolve(DATA_DIR, "domains"));
    await FederationCentralBank.getInstance().init(bank, cbLoader);

    // ── Founding member bootstrap ──────────────────────────────────────────
    await bootstrapFoundingMember(bank);

    // ── Routes ─────────────────────────────────────────────────────────────
    app.use("/api",      federationRoutes);
    app.use("/api/node", networkRouter);

    // Identity endpoint — member communities and other nodes resolve public key here
    app.get("/api/identity", (_req, res) => {
        const node = NodeService.getInstance();
        res.json({
            id:        node.nodeId,
            publicKey: node.getSigner().publicKeyHex,
            type:      "federation",
            name:      node.nodeName,
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
