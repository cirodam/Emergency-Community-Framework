import { requirePersonCredential, requireAppPermission, AppSuspensionCache, requireNotAppSuspended } from "@ecf/core";
import { getCommunityIdentity } from "../communityIdentity.js";

const COMMUNITY_URL   = process.env.COMMUNITY_URL ?? "http://localhost:3002";
const suspensionCache = new AppSuspensionCache(COMMUNITY_URL);

/** Verifies a valid community-issued PersonCredential. */
export const requireAuth           = requirePersonCredential(getCommunityIdentity);
export const requireNotSuspended   = requireNotAppSuspended("atheneum", suspensionCache);

/** Requires `atheneum: coordinator` permission. */
export const requireCoordinator    = [requireAuth, requireNotSuspended, requireAppPermission("atheneum", "coordinator")];

/** Base auth + suspension check for standard atheneum routes. */
export const requireAtheneumAccess = [requireAuth, requireNotSuspended];
