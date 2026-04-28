import { Router } from "express";
import { ClusterService, verifyNodeSignature } from "@ecf/core";

/**
 * Routes for inter-cluster coordination.
 *
 * GET  /status    — public; returns this node's role and peer health
 * GET  /snapshot  — community-key auth required; streams all data files
 *                   (primary only; used by replicas for cold-start and
 *                   background sync)
 */
export function clusterRoutes(communityPublicKey: string): Router {
    const router  = Router();
    const cluster = ClusterService.getInstance();

    // Any node that holds the community private key may pull a snapshot.
    const requireCommunityAuth = verifyNodeSignature(() => communityPublicKey);

    router.get("/status",   cluster.statusHandler());
    router.get("/snapshot", requireCommunityAuth, cluster.snapshotHandler());

    return router;
}
