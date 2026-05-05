import express from "express";
import { fileURLToPath } from "url";
import { dirname, join, resolve } from "path";
import { initServiceNode, resolveCommunityIdentity, networkRouter, messageRouter } from "@ecf/core";
import { AtheneumDb } from "./AtheneumDb.js";
import { SessionLoader } from "./SessionLoader.js";
import { SessionService } from "./SessionService.js";
import { CourseLoader } from "./CourseLoader.js";
import { CourseService } from "./CourseService.js";
import { ClassRequestLoader } from "./ClassRequestLoader.js";
import { ClassRequestService } from "./ClassRequestService.js";
import { setCommunityIdentity } from "./communityIdentity.js";
import atheneumRoutes from "./routes/atheneumRoutes.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const PORT          = Number(process.env.PORT          ?? 3004);
const DATA_DIR      = process.env.DATA_DIR              ?? join(__dirname, "../../data");
const BANK_URL      = process.env.BANK_URL              ?? "http://localhost:3001";
const COMMUNITY_URL = process.env.COMMUNITY_URL         ?? "http://localhost:3002";

const PUBLIC_COMMUNITY_URL  = process.env.PUBLIC_COMMUNITY_URL  ?? "http://localhost:3002";
const PUBLIC_BANK_URL       = process.env.PUBLIC_BANK_URL       ?? "http://localhost:3001";
const PUBLIC_MARKET_URL     = process.env.PUBLIC_MARKET_URL     ?? "http://localhost:3003";
const PUBLIC_MAIL_URL       = process.env.PUBLIC_MAIL_URL       ?? "http://localhost:3020";
const PUBLIC_ATHENEUM_URL   = process.env.PUBLIC_ATHENEUM_URL   ?? "http://localhost:3004";

const app = express();

app.use(express.json({
    verify: (req, _res, buf) => {
        (req as typeof req & { rawBody: string }).rawBody = buf.toString("utf-8");
    },
}));

async function main(): Promise<void> {
    await initServiceNode({
        name:         "atheneum",
        port:         PORT,
        dataDir:      resolve(DATA_DIR),
        communityUrl: COMMUNITY_URL,
        seeds:        process.env.BOOTSTRAP_PEERS,
    });

    AtheneumDb.init(resolve(DATA_DIR));

    const sessionLoader = new SessionLoader();
    SessionService.getInstance().init(sessionLoader);

    const courseLoader = new CourseLoader();
    CourseService.getInstance().init(courseLoader);

    const classRequestLoader = new ClassRequestLoader();
    ClassRequestService.getInstance().init(classRequestLoader);

    // Resolve community identity non-blocking — public endpoints work immediately
    resolveCommunityIdentity(COMMUNITY_URL, "[atheneum]")
        .then(id => setCommunityIdentity(id.nodeId, id.publicKey))
        .catch(err => console.error("[atheneum] community identity resolution failed:", err));

    app.use("/api", atheneumRoutes);
    app.use("/api", networkRouter);
    app.use("/api", messageRouter);

    // Config endpoint — consumed by the frontend for community redirect and app switcher
    app.get("/api/config", (_req, res) => {
        res.json({
            communityUrl:  PUBLIC_COMMUNITY_URL,
            bankUrl:       PUBLIC_BANK_URL,
            marketUrl:     PUBLIC_MARKET_URL,
            mailUrl:       PUBLIC_MAIL_URL,
            atheneumUrl:   PUBLIC_ATHENEUM_URL,
        });
    });

    // Serve built frontend
    const publicDir = resolve(__dirname, "../../atheneum/public");
    app.use(express.static(publicDir));
    app.get("*splat", (_req, res) => {
        res.sendFile(join(publicDir, "index.html"));
    });

    app.listen(PORT, () => {
        console.info(`[atheneum] listening on port ${PORT}`);
    });
}

main().catch(err => {
    console.error("[atheneum] fatal:", err);
    process.exit(1);
});
