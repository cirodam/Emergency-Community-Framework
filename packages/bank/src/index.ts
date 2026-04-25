import express from "express";
import { fileURLToPath } from "url";
import { dirname, join, resolve } from "path";
import { NodeService, DataManifest, networkRouter } from "@ecf/core";
import { Bank } from "./Bank.js";
import { AccountLoader } from "./AccountLoader.js";
import { TransactionLoader } from "./TransactionLoader.js";
import { BankCharterLoader } from "./BankCharterLoader.js";
import { AccountOwnerLoader } from "./AccountOwnerLoader.js";
import { AccountOwnerService } from "./AccountOwnerService.js";
import bankRoutes from "./routes/bankRoutes.js";
import ownerRoutes from "./routes/ownerRoutes.js";

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

/**
 * Resolve the owning node's ID.
 * If OWNER_NODE_ID is set explicitly, use it directly.
 * Otherwise fetch it from COMMUNITY_URL/api/identity, retrying with backoff
 * until the community node is reachable.
 */
async function resolveOwnerNodeId(): Promise<string> {
    const explicit = process.env.OWNER_NODE_ID;
    if (explicit) return explicit;

    const communityUrl = process.env.COMMUNITY_URL;
    if (!communityUrl) {
        throw new Error(
            "[bank] Either OWNER_NODE_ID or COMMUNITY_URL must be set"
        );
    }

    const url = `${communityUrl}/api/identity`;
    for (let attempt = 1; ; attempt++) {
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const body = await res.json() as { id?: string };
            if (!body.id) throw new Error("identity response missing id");
            console.log(`[bank] resolved owner node ID from community: ${body.id}`);
            return body.id;
        } catch (err) {
            const wait = Math.min(30_000, attempt * 5_000);
            console.warn(`[bank] community not reachable (attempt ${attempt}), retrying in ${wait / 1000}s — ${err}`);
            await new Promise(r => setTimeout(r, wait));
        }
    }
}

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

    const accountLoader      = new AccountLoader(resolve(DATA_DIR, "accounts"));
    const transactionLoader  = new TransactionLoader(resolve(DATA_DIR, "transactions"));
    const ownerLoader        = new AccountOwnerLoader(resolve(DATA_DIR, "owners"));
    Bank.getInstance().init(accountLoader, transactionLoader);
    AccountOwnerService.getInstance().init(ownerLoader);

    const ownerNodeId = await resolveOwnerNodeId();
    const ownerType   = process.env.OWNER_TYPE as "community" | "federation" | undefined ?? "community";
    if (ownerType !== "community" && ownerType !== "federation") {
        throw new Error(`[bank] OWNER_TYPE must be "community" or "federation", got "${ownerType}"`);
    }
    const charter = new BankCharterLoader(DATA_DIR).load(ownerNodeId, ownerType);

    // API routes
    app.use("/api", bankRoutes);
    app.use("/api", ownerRoutes);
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
export { AccountOwner } from "./AccountOwner.js";
export type { AccountOwnerRecord, OwnerType } from "./AccountOwner.js";
export { AccountOwnerLoader } from "./AccountOwnerLoader.js";
export { AccountOwnerService } from "./AccountOwnerService.js";
export type { CreateOwnerOptions } from "./AccountOwnerService.js";
