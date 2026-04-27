import express from "express";
import { fileURLToPath } from "url";
import { dirname, join, resolve } from "path";
import { initServiceNode, resolveCommunityIdentity, networkRouter } from "@ecf/core";
import { ListingLoader } from "./ListingLoader.js";
import { ListingService } from "./ListingService.js";
import { setCommunityIdentity } from "./communityIdentity.js";
import marketRoutes from "./routes/marketRoutes.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const PORT          = Number(process.env.PORT          ?? 3003);
const DATA_DIR      = process.env.DATA_DIR              ?? join(__dirname, "../../data");
const BANK_URL      = process.env.BANK_URL              ?? "http://localhost:3001";
const COMMUNITY_URL = process.env.COMMUNITY_URL         ?? "http://localhost:3002";

const app = express();

app.use(express.json({
    verify: (req, _res, buf) => {
        (req as typeof req & { rawBody: string }).rawBody = buf.toString("utf-8");
    },
}));

async function main(): Promise<void> {
    await initServiceNode({
        name:         "market",
        port:         PORT,
        dataDir:      resolve(DATA_DIR),
        communityUrl: COMMUNITY_URL,
        seeds:        process.env.BOOTSTRAP_PEERS,
    });

    // Listings
    const listingLoader = new ListingLoader(resolve(DATA_DIR, "listings"));
    ListingService.getInstance().init(listingLoader);

    // Resolve community identity non-blocking — public endpoints work immediately
    resolveCommunityIdentity(COMMUNITY_URL, "[market]")
        .then(id => setCommunityIdentity(id.nodeId, id.publicKey))
        .catch(err => console.error("[market] community identity resolution failed:", err));

    app.use("/api",      marketRoutes);
    app.use("/api/node", networkRouter);

    app.get("/health", (_req, res) => {
        res.json({
            status:   "ok",
            bankUrl:  BANK_URL,
            listings: ListingService.getInstance().getAll().length,
        });
    });

    app.get("/api/config", (_req, res) => {
        res.json({
            communityUrl: process.env.PUBLIC_COMMUNITY_URL ?? COMMUNITY_URL,
            bankUrl:      process.env.PUBLIC_BANK_URL      ?? "http://localhost:3001",
            marketUrl:    process.env.PUBLIC_MARKET_URL    ?? `http://localhost:${PORT}`,
            mailUrl:      process.env.PUBLIC_MAIL_URL      ?? "http://localhost:3020",
        });
    });

    // Serve frontend
    const publicDir = join(__dirname, "../public");
    app.use(express.static(publicDir));
    app.get("*splat", (_req, res) => {
        res.sendFile(join(publicDir, "index.html"));
    });

    app.listen(PORT, () => {
        console.log(`[market] listening on port ${PORT} (bank: ${BANK_URL}, community: ${COMMUNITY_URL})`);
    });
}

main().catch(err => {
    console.error("[market] startup failed:", err);
    process.exit(1);
});
