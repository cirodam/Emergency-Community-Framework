import express from "express";
import { fileURLToPath } from "url";
import { dirname, join, resolve } from "path";
import { initServiceNode, resolveCommunityIdentity, networkRouter, messageRouter } from "@ecf/core";
import { MessageLoader } from "./MessageLoader.js";
import { MessageService } from "./MessageService.js";
import { setCommunityIdentity } from "./communityIdentity.js";
import mailRoutes from "./routes/mailRoutes.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const PORT          = Number(process.env.PORT          ?? 3020);
const DATA_DIR      = process.env.DATA_DIR              ?? join(__dirname, "../../data");
const COMMUNITY_URL = process.env.COMMUNITY_URL         ?? "http://localhost:3002";

const app = express();

app.use(express.json({
    verify: (req, _res, buf) => {
        (req as typeof req & { rawBody: string }).rawBody = buf.toString("utf-8");
    },
}));

async function main(): Promise<void> {
    await initServiceNode({
        name:         "mail",
        port:         PORT,
        dataDir:      resolve(DATA_DIR),
        communityUrl: COMMUNITY_URL,
        seeds:        process.env.BOOTSTRAP_PEERS,
    });

    const loader = new MessageLoader(resolve(DATA_DIR, "mail"));
    MessageService.getInstance().init(loader);

    resolveCommunityIdentity(COMMUNITY_URL, "[mail]")
        .then(id => setCommunityIdentity(id.nodeId, id.publicKey))
        .catch(err => console.error("[mail] community identity resolution failed:", err));

    app.use("/api",      mailRoutes);
    app.use("/api/node",    networkRouter);
    app.use("/api/message", messageRouter);

    app.get("/health", (_req, res) => {
        res.json({ status: "ok", communityUrl: COMMUNITY_URL });
    });

    app.get("/api/config", (_req, res) => {
        res.json({
            communityUrl: process.env.PUBLIC_COMMUNITY_URL ?? COMMUNITY_URL,
            bankUrl:      process.env.PUBLIC_BANK_URL      ?? "http://localhost:3001",
            marketUrl:    process.env.PUBLIC_MARKET_URL    ?? "http://localhost:3003",
            mailUrl:      process.env.PUBLIC_MAIL_URL      ?? `http://localhost:${PORT}`,
        });
    });

    // Serve frontend
    const publicDir = join(__dirname, "../public");
    app.use(express.static(publicDir));
    app.get("*splat", (_req, res) => {
        res.sendFile(join(publicDir, "index.html"));
    });

    app.listen(PORT, () => {
        console.log(`[mail] listening on port ${PORT} (community: ${COMMUNITY_URL})`);
    });
}

main().catch(err => {
    console.error("[mail] startup failed:", err);
    process.exit(1);
});
