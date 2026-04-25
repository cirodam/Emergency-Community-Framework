import express from "express";
import { fileURLToPath } from "url";
import { dirname, join, resolve } from "path";
import { NodeService, DataManifest, networkRouter } from "@ecf/core";
import { Bank } from "./Bank.js";
import { AccountLoader } from "./AccountLoader.js";
import { TransactionLoader } from "./TransactionLoader.js";
import { BankCharterLoader } from "./BankCharterLoader.js";
import bankRoutes from "./routes/bankRoutes.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const PORT = Number(process.env.PORT ?? 3001);
const DATA_DIR = process.env.DATA_DIR ?? join(__dirname, "../../data");

const app = express();

// Capture raw body for node signature verification
app.use(express.json({
    verify: (req, _res, buf) => {
        (req as typeof req & { rawBody: string }).rawBody = buf.toString("utf-8");
    },
}));

async function main(): Promise<void> {
    await NodeService.getInstance().init({
        type: "infrastructure",
        name: process.env.NODE_NAME ?? "bank",
        address: process.env.NODE_ADDRESS ?? `http://localhost:${PORT}`,
        dataDir: resolve(DATA_DIR, "network"),
        seeds: (process.env.BOOTSTRAP_PEERS ?? "").split(",").filter(Boolean),
    });

    DataManifest.getInstance().init(
        body => NodeService.getInstance().getSigner().signBody(body),
        NodeService.getInstance().getSigner().publicKeyHex
    );

    const accountLoader = new AccountLoader(resolve(DATA_DIR, "accounts"));
    const transactionLoader = new TransactionLoader(resolve(DATA_DIR, "transactions"));
    Bank.getInstance().init(accountLoader, transactionLoader);

    const ownerNodeId = process.env.OWNER_NODE_ID;
    const ownerType   = process.env.OWNER_TYPE as "community" | "federation" | undefined;
    if (!ownerNodeId || !ownerType) {
        throw new Error("[bank] OWNER_NODE_ID and OWNER_TYPE env vars are required");
    }
    if (ownerType !== "community" && ownerType !== "federation") {
        throw new Error(`[bank] OWNER_TYPE must be "community" or "federation", got "${ownerType}"`);
    }
    const charter = new BankCharterLoader(DATA_DIR).load(ownerNodeId, ownerType);

    // API routes
    app.use("/api", bankRoutes);
    app.use("/api/node", networkRouter);

    // Charter — who governs this bank
    app.get("/api/charter", (_req, res) => { res.json(charter); });

    // Health check
    app.get("/health", (_req, res) => { res.json({ status: "ok" }); });

    // Serve frontend (production build from public/)
    const publicDir = join(__dirname, "../public");
    app.use(express.static(publicDir));
    app.get("*splat", (_req, res) => {
        res.sendFile(join(publicDir, "index.html"));
    });

    app.listen(PORT, () => {
        console.log(`[bank] listening on port ${PORT}`);
    });
}

main().catch(err => {
    console.error("[bank] startup failed:", err);
    process.exit(1);
});

export { Bank } from "./Bank.js";
export { BankAccount } from "./BankAccount.js";
export { BankTransaction } from "./BankTransaction.js";
export type { Currency } from "./BankTransaction.js";
export { AccountLoader } from "./AccountLoader.js";
export { TransactionLoader } from "./TransactionLoader.js";
export { BankCharterLoader } from "./BankCharterLoader.js";
export type { BankCharter, CharterOwnerType } from "./BankCharterLoader.js";
