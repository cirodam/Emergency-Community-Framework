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

const app = express();

app.use(express.json({
    verify: (req, _res, buf) => {
        (req as typeof req & { rawBody: string }).rawBody = buf.toString("utf-8");
    },
}));

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
