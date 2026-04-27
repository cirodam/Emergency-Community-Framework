import express from "express";
import { fileURLToPath } from "url";
import { dirname, join, resolve } from "path";
import { NodeService, DataManifest, networkRouter } from "@ecf/core";
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

async function resolveCommunityIdentity(): Promise<void> {
    const url = `${COMMUNITY_URL}/api/identity`;
    for (let attempt = 1; ; attempt++) {
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const body = await res.json() as { id?: string; publicKey?: string };
            if (!body.id || !body.publicKey) throw new Error("Identity response missing fields");
            setCommunityIdentity(body.id, body.publicKey);
            console.log(`[mail] resolved community identity: ${body.id}`);
            return;
        } catch (err) {
            const wait = Math.min(30_000, attempt * 5_000);
            console.warn(
                `[mail] community not reachable (attempt ${attempt}), ` +
                `retrying in ${wait / 1000}s — ${(err as Error).message}`,
            );
            await new Promise(r => setTimeout(r, wait));
        }
    }
}

async function main(): Promise<void> {
    await NodeService.getInstance().init({
        type:    "infrastructure",
        name:    process.env.NODE_NAME    ?? "mail",
        address: process.env.NODE_ADDRESS ?? `http://localhost:${PORT}`,
        dataDir: resolve(DATA_DIR, "network"),
        seeds:   (process.env.BOOTSTRAP_PEERS ?? "").split(",").filter(Boolean),
    });

    DataManifest.getInstance().init(
        body => NodeService.getInstance().getSigner().signBody(body),
        NodeService.getInstance().getSigner().publicKeyHex,
    );

    const loader = new MessageLoader(resolve(DATA_DIR, "mail"));
    MessageService.getInstance().init(loader);

    resolveCommunityIdentity().catch(err =>
        console.error("[mail] community identity resolution failed:", err),
    );

    app.use("/api",      mailRoutes);
    app.use("/api/node", networkRouter);

    app.get("/health", (_req, res) => {
        res.json({ status: "ok", communityUrl: COMMUNITY_URL });
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
