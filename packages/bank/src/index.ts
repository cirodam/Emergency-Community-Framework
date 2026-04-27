import express from "express";
import { fileURLToPath } from "url";
import { dirname, join, resolve } from "path";
import { initServiceNode, resolveCommunityIdentity, networkRouter } from "@ecf/core";
import { Bank } from "./Bank.js";
import { AccountLoader } from "./AccountLoader.js";
import { TransactionLoader } from "./TransactionLoader.js";
import { BankCharterLoader } from "./BankCharterLoader.js";
import { AccountOwnerLoader } from "./AccountOwnerLoader.js";
import { AccountOwnerService } from "./AccountOwnerService.js";
import bankRoutes from "./routes/bankRoutes.js";
import ownerRoutes from "./routes/ownerRoutes.js";
import { setCommunityIdentity } from "./communityIdentity.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const PORT      = Number(process.env.PORT     ?? 3001);
const DATA_DIR  = process.env.DATA_DIR         ?? join(__dirname, "../../data");
const COMMUNITY_URL = process.env.COMMUNITY_URL ?? "http://localhost:3002";

const app = express();

app.use(express.json({
    verify: (req, _res, buf) => {
        (req as typeof req & { rawBody: string }).rawBody = buf.toString("utf-8");
    },
}));

async function main(): Promise<void> {
    await initServiceNode({
        name:         "bank",
        port:         PORT,
        dataDir:      resolve(DATA_DIR),
        communityUrl: COMMUNITY_URL,
        seeds:        process.env.BOOTSTRAP_PEERS,
    });

    const accountLoader      = new AccountLoader(resolve(DATA_DIR, "accounts"));
    const transactionLoader  = new TransactionLoader(resolve(DATA_DIR, "transactions"));
    const ownerLoader        = new AccountOwnerLoader(resolve(DATA_DIR, "owners"));
    Bank.getInstance().init(accountLoader, transactionLoader);
    AccountOwnerService.getInstance().init(ownerLoader);

    // Bank supports explicit override via env vars (for federation-owned banks)
    const explicitId  = process.env.OWNER_NODE_ID;
    const explicitKey = process.env.COMMUNITY_PUBLIC_KEY;
    const community = explicitId && explicitKey
        ? { nodeId: explicitId, publicKey: explicitKey }
        : await resolveCommunityIdentity(COMMUNITY_URL, "[bank]");

    const ownerType = process.env.OWNER_TYPE as "community" | "federation" | undefined ?? "community";
    if (ownerType !== "community" && ownerType !== "federation") {
        throw new Error(`[bank] OWNER_TYPE must be "community" or "federation", got "${ownerType}"`);
    }
    setCommunityIdentity(community.nodeId, community.publicKey);
    const charter = new BankCharterLoader(DATA_DIR).load(community.nodeId, ownerType);

    // API routes
    app.use("/api", bankRoutes);
    app.use("/api", ownerRoutes);
    app.use("/api/node", networkRouter);

    // Charter — who governs this bank
    app.get("/api/charter", (_req, res) => { res.json(charter); });

    // Public config — tells the frontend the browser-accessible service URLs
    app.get("/api/config", (_req, res) => {
        res.json({
            communityUrl: process.env.PUBLIC_COMMUNITY_URL ?? COMMUNITY_URL,
            bankUrl:      process.env.PUBLIC_BANK_URL      ?? `http://localhost:${PORT}`,
            marketUrl:    process.env.PUBLIC_MARKET_URL    ?? "http://localhost:3003",
            mailUrl:      process.env.PUBLIC_MAIL_URL      ?? "http://localhost:3020",
        });
    });

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
export { AccountOwner } from "./AccountOwner.js";
export type { AccountOwnerRecord, OwnerType } from "./AccountOwner.js";
export { AccountOwnerLoader } from "./AccountOwnerLoader.js";
export { AccountOwnerService } from "./AccountOwnerService.js";
export type { CreateOwnerOptions } from "./AccountOwnerService.js";
